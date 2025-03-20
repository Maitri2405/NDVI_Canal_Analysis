// Step 1: Define the study area (Replace with your command area shapefile)
var commandArea = ee.FeatureCollection("projects/ee-23110192/assets/Narmada_Canal_Command_area"); // Change this to your asset name
var regions = commandArea.geometry();
Map.centerObject(regions, 8);

// Display the study area
var outline = ee.Image().byte().paint({
  featureCollection: commandArea,
  color: 1,
  width: 1
});
Map.addLayer(outline, {palette: ['blue']}, 'AOI');

// Step 2: Collect Precipitation Data (CHIRPS Daily for 30 years)
var filteredCollection = ee.ImageCollection("UCSB-CHG/CHIRPS/DAILY")
                .select('precipitation')
                .filterDate('2000-01-01', '2024-12-31'); // 30 years of data

// Step 3: Compute Precipitation Time Series
var timeSeries = ee.FeatureCollection(filteredCollection.map(function(image) {
  var stats = image.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: regions,
    scale: 5000, // CHIRPS resolution is ~5.6km, so 5000m is suitable
    maxPixels: 1e10
  });

  var precip = ee.List([stats.get('precipitation'), -9999]) // Handle missing data
    .reduce(ee.Reducer.firstNonNull());

  var f = ee.Feature(null, {
    'precip': precip,
    'date': ee.Date(image.get('system:time_start')).format('YYYY-MM-dd')
  });
  return f;
}));

// Step 4: Check the results
print(timeSeries.first());

// Step 5: Export Precipitation Time Series to CSV
Export.table.toDrive({
    collection: timeSeries,
    description: 'precip_time_series_30years',
    folder: 'earthengine',
    fileNamePrefix: 'precip_30_years',
    fileFormat: 'CSV'
});
