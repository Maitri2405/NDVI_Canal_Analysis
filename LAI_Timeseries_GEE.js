// Step 1: Define study area
// Step 1: Define study area
var ecoregion = ee.FeatureCollection("projects/ee-23110192/assets/Narmada_Canal_Command_area");

Map.centerObject(ecoregion);
  
// print(regions);

// Show the study area 
var outline = ee.Image().byte().paint({
  featureCollection: ecoregion,
  color: 1,
  width: 1
});
Map.addLayer(outline, {palette: ['blue']}, 'AOI')

// Show the study area 
var outline = ee.Image().byte().paint({
  featureCollection: ecoregion,
  color: 1,
  width: 1
});
Map.addLayer(outline, {palette: ['blue']}, 'AOI');

// Step 2: Collect Data
var filteredCollection = ee.ImageCollection('MODIS/061/MOD15A2H')
                .select('Lai_500m')
                .filterDate('2001-01-01', '2023-12-31');

var timeSeries = ee.FeatureCollection(filteredCollection.map(function(image) {
  var stats = image.reduceRegion({
    reducer: ee.Reducer.mean(),
    geometry: ecoregion,
    scale: 500,
    maxPixels: 1e10
  })
  // reduceRegion doesn't return any output if the image doesn't intersect
  // with the point or if the image is masked out due to cloud
  // If there was no ndvi value found, we set the ndvi to a NoData value -9999
  var lai = ee.List([stats.get('Lai_500m'), -9999])
    .reduce(ee.Reducer.firstNonNull())
 
  // Create a feature with null geometry and NDVI value and date as properties
  var f = ee.Feature(null, {'lai': lai,
    'date': ee.Date(image.get('system:time_start')).format('YYYY-MM-dd')})
  return f
}))
 
// Check the results
print(timeSeries.first())
 
// Export to CSV
Export.table.toDrive({
    collection: timeSeries,
    description: 'LAI_time_series',
    folder: 'earthengine',
    fileNamePrefix: 'LAI_time_series',
    fileFormat: 'CSV'
})
