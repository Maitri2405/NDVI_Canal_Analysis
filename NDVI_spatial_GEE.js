// Step 1: Load all 10 shapefiles
var shapefile1 = ee.FeatureCollection('projects/ee-23110192/assets/Buckingham_Canal_Command_Area');
var shapefile2 = ee.FeatureCollection('projects/ee-23110192/assets/Narmada_Canal_Command_area');
var shapefile3 = ee.FeatureCollection('projects/ee-23110192/assets/Sirhind_Canal_command_area');
var shapefile4 = ee.FeatureCollection('projects/ee-23110192/assets/Sutlej_Canal_command_Area');
var shapefile5 = ee.FeatureCollection('projects/ee-23110192/assets/andhara-karantaka_canal');
var shapefile6 = ee.FeatureCollection('projects/ee-23110192/assets/indira_gandhi_canals_command_area');
var shapefile7 = ee.FeatureCollection('projects/ee-23110192/assets/lower_bhavani_command_area');
var shapefile8 = ee.FeatureCollection('projects/ee-23110192/assets/sharda_command_area');
var shapefile9 = ee.FeatureCollection('projects/ee-23110192/assets/upper_ganga_command_area');
var shapefile10 = ee.FeatureCollection('projects/ee-23110192/assets/upper_ganga_in_uttarakhand');

// Step 2: Merge all shapefiles into a single FeatureCollection
var mergedShapefiles = ee.FeatureCollection([]) // Start with an empty collection
  .merge(shapefile1)
  .merge(shapefile2)
  .merge(shapefile3)
  .merge(shapefile4)
  .merge(shapefile5)
  .merge(shapefile6)
  .merge(shapefile7)
  .merge(shapefile8)
  .merge(shapefile9)
  .merge(shapefile10);

// Visualize the merged shapefiles
Map.addLayer(mergedShapefiles, {color: 'black'}, 'Merged Shapefiles');

// Center the map on the merged shapefiles
Map.centerObject(mergedShapefiles, 10);

var geometry = mergedShapefiles;

// Step 3: Import Sentinel-2 dataset and apply cloud masking
function maskS2clouds(image) {
  var qa = image.select('QA60');

  // Bits 10 and 11 are clouds and cirrus, respectively.
  var cloudBitMask = 1 << 10;
  var cirrusBitMask = 1 << 11;

  // Both flags should be set to zero, indicating clear conditions.
  var mask = qa.bitwiseAnd(cloudBitMask).eq(0)
      .and(qa.bitwiseAnd(cirrusBitMask).eq(0));

  return image.updateMask(mask).divide(10000);
}

// Import Sentinel-2 dataset
var dataset = ee.ImageCollection('COPERNICUS/S2_SR')
                  .filterDate('2023-01-01', '2023-03-31') // Adjust date range as needed
                  .filter(ee.Filter.lt('CLOUDY_PIXEL_PERCENTAGE', 10)) // Filter for less cloudy images
                  .filterBounds(geometry) // Filter by the merged shapefiles boundary
                  .map(maskS2clouds); // Apply cloud masking

print('Number of Available Images', dataset.size());

// Visualize the RGB composite
var rgbVis = {min: 0.0, max: 0.5, bands: ['B8', 'B4', 'B3']}; // False Color Composite (FCC)
var composite = dataset.median().clip(geometry); // Create a median composite and clip to the merged shapefiles
Map.addLayer(composite, rgbVis, 'RGB Composite');

// Step 4: Calculate spectral indices (NDVI and EVI)
// Function to add NDVI band
function addNDVI(image) {
  var ndvi = image.normalizedDifference(['B8', 'B4']).rename('NDVI'); 
  return image.addBands(ndvi);
}

// Map the function over the collection
var withNDVI = dataset.map(addNDVI);
var composite = withNDVI.median();
var ndviComposite = composite.select('NDVI').clip(geometry);

// Visualize NDVI
var palette = ['1e7abb', 'eaeaea', 'ccc682', '91bf51', '70a33f', '4f892d', '306d1c', '0f540a', '004400'];
var ndviVis = {min: 0, max: 0.6, palette: palette};
Map.addLayer(ndviComposite, ndviVis, 'NDVI');

// Calculate EVI
var evi = composite.expression(
    '2.5 * ((NIR - RED) / (NIR + 6*RED - 7.5*BLUE + 1))', {
      'NIR': composite.select('B8'),
      'RED': composite.select('B4'),
      'BLUE': composite.select('B2'),
}).rename('evi');

// Visualize EVI
Map.addLayer(evi.clip(geometry), ndviVis, 'EVI');

// Step 5: Export the results (optional)
// Export NDVI to Google Drive
Export.image.toDrive({
  image: ndviComposite,
  description: 'NDVI_Export',
  scale: 10,
  region: geometry,
  fileFormat: 'GeoTIFF',
  maxPixels: 1e13
});

// Export EVI to Google Drive
Export.image.toDrive({
  image: evi.clip(geometry),
  description: 'EVI_Export',
  scale: 10,
  region: geometry,
  fileFormat: 'GeoTIFF',
  maxPixels: 1e13
});
