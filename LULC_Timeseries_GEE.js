// Step 1: Define Geometry
var commandArea = ee.FeatureCollection("projects/ee-23110192/assets/Narmada_Canal_Command_area");
// Step 1: Define the Geometry (Your Shapefile)
var regions = commandArea.geometry();
Map.centerObject(regions, 8);

// Display the study area boundary
var outline = ee.Image().byte().paint({
  featureCollection: commandArea,
  color: 1,
  width: 1
});
Map.addLayer(outline, {palette: 'red'}, 'Study Area Outline');

// Step 2: Import MODIS Land Cover Data
var dataset = ee.ImageCollection('MODIS/061/MCD12Q1');  // MODIS LULC Collection
var igbpLandCover = dataset.select('LC_Type1');  // Select LULC classification band

// Define visualization parameters
var igbpLandCoverVis = {
  min: 1,
  max: 17,
  palette: [
    '05450a', '086a10', '54a708', '78d203', '009900', 'c6b044', 'dcd159',
    'dade48', 'fbff13', 'b6ff05', '27ff87', 'c24f44', 'a5a5a5', 'ff6d4c',
    '69fff8', 'f9ffa4', '1c0dff'
  ],
};

// Display first image to check coverage
Map.addLayer(igbpLandCover.first().clip(regions), igbpLandCoverVis, 'IGBP Land Cover');

// Step 3: Define a Function to Compute LULC Area
function calculateLULC(image) {
  var forest = image.eq(5).multiply(ee.Image.pixelArea()).divide(1e6).rename('forest');
  var grassland = image.eq(10).multiply(ee.Image.pixelArea()).divide(1e6).rename('grassland');
  var cropland = image.eq(12).multiply(ee.Image.pixelArea()).divide(1e6).rename('cropland');
  var urban = image.eq(13).multiply(ee.Image.pixelArea()).divide(1e6).rename('urban');
  var water = image.eq(17).multiply(ee.Image.pixelArea()).divide(1e6).rename('water');
  
  return image.addBands(forest).addBands(grassland).addBands(cropland).addBands(urban).addBands(water)
              .copyProperties(image, ['system:time_start']);
}

// Apply the function over the image collection
var lulc_area = igbpLandCover.map(calculateLULC);

// Step 4: Plot Time Series for the Region
var chart = ui.Chart.image.series({
  imageCollection: lulc_area.select(['forest', 'grassland', 'cropland', 'urban', 'water']),
  region: regions,
  reducer: ee.Reducer.sum(),
  scale: 500,  // Adjust scale as needed
}).setChartType('LineChart')
  .setOptions({
    title: 'LULC Area Change Over Time',
    vAxis: {title: 'Area (km²)'},
    hAxis: {title: 'Year', format: 'YYYY'},
    lineWidth: 2,
    pointSize: 3,
    colors: ['009900', 'b6ff05', 'c24f44', 'a5a5a5', '1c0dff']
  });

// Print the chart
print(chart);
