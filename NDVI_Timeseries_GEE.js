// Step 1: Define the study area (Replace with your command area)
var commandArea = ee.FeatureCollection("projects/ee-23110192/assets/Narmada_Canal_Command_area"); // Replace with your asset name
var regions = commandArea.geometry();
Map.centerObject(regions, 8);

// Display the study area
var outline = ee.Image().byte().paint({
  featureCollection: commandArea,
  color: 1,
  width: 1
});
Map.addLayer(outline, {palette: ['blue']}, 'AOI');

// Step 2: Collect MODIS NDVI Data (2000-2024)
var modis = ee.ImageCollection("MODIS/061/MOD13Q1")
                .select('NDVI')
                .filterDate('2000-01-01', '2024-12-31');

// Step 3: Compute NDVI Time Series
var timeSeries = ee.FeatureCollection(modis.map(function(image) {
  var stats = image.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: regions,
    scale: 500, // Adjust for resolution consistency
    maxPixels: 1e10
  });

  var ndvi = ee.List([stats.get('NDVI'), -9999]) // Handle NoData values
    .reduce(ee.Reducer.firstNonNull());

  var f = ee.Feature(null, {
    'NDVI': ndvi,
    'date': ee.Date(image.get('system:time_start')).format('YYYY-MM-dd')
  });
  return f;
}));

// Step 4: Check the results
print(timeSeries.first());

// Step 5: Export NDVI Time Series to CSV
Export.table.toDrive({
    collection: timeSeries,
    description: 'ndvi_time_series_2000_2024',
    folder: 'earthengine',
    fileNamePrefix: 'ndvi_2000_2024',
    fileFormat: 'CSV'
});
