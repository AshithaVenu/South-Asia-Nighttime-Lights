// =====================================================
// SOUTH ASIA AT NIGHT — 2010–2025
// DMSP-OLS + VIIRS
//
// Black background
// Bright nighttime lights
// Year in upper-right corner
// Night-light intensity legend
//
// No external fonts or packages are used.
// =====================================================


// =====================================================
// 1. STUDY AREA
// =====================================================

var WEST  = 60;
var SOUTH = 5;
var EAST  = 100;
var NORTH = 38;

var region = ee.Geometry.Rectangle(
  [WEST, SOUTH, EAST, NORTH],
  'EPSG:4326',
  false
);


// =====================================================
// 2. GIF SETTINGS
// =====================================================

var DIMENSIONS = 1200;
var FPS = 3;


// =====================================================
// 3. DATA
// =====================================================

// DMSP-OLS: 2010–2013
var dmsp = ee.ImageCollection(
  'NOAA/DMSP-OLS/NIGHTTIME_LIGHTS'
).select('stable_lights');


// VIIRS monthly nighttime lights
// Annual averages will be calculated from monthly data.
var viirs = ee.ImageCollection(
  'NOAA/VIIRS/DNB/MONTHLY_V1/VCMSLCFG'
).select('avg_rad');


// =====================================================
// 4. NIGHT-LIGHT COLOR PALETTE
// =====================================================

var PALETTE = [
  '07102f',
  '101f66',
  '174ea6',
  '168aad',
  '22d3ee',
  'fde047',
  'fb923c',
  'ffffff'
];


// =====================================================
// 5. DMSP VISUALIZATION
// =====================================================

var DMSP_MIN = 1;
var DMSP_MAX = 63;

function visualizeDMSP(image) {

  return image
    .subtract(DMSP_MIN)
    .divide(DMSP_MAX - DMSP_MIN)
    .clamp(0, 1)
    .pow(0.65)
    .visualize({
      min: 0,
      max: 1,
      palette: PALETTE
    });
}


// =====================================================
// 6. VIIRS VISUALIZATION
// =====================================================

var VIIRS_MIN = 0;
var VIIRS_MAX = 60;

function visualizeVIIRS(image) {

  return image
    .clamp(VIIRS_MIN, VIIRS_MAX)
    .divide(VIIRS_MAX)
    .clamp(0, 1)
    .pow(0.55)
    .visualize({
      min: 0,
      max: 1,
      palette: PALETTE
    });
}


// =====================================================
// 7. GET DMSP IMAGE
// =====================================================

function getDMSP(year) {

  var image = dmsp
    .filter(
      ee.Filter.calendarRange(
        year,
        year,
        'year'
      )
    )
    .mean();

  return image.clip(region);
}


// =====================================================
// 8. GET VIIRS ANNUAL IMAGE
// =====================================================

function getVIIRS(year) {

  var start = ee.Date.fromYMD(
    year,
    1,
    1
  );

  var end = start.advance(
    1,
    'year'
  );

  return viirs
    .filterDate(start, end)
    .mean()
    .clip(region);
}


// =====================================================
// 9. BLACK BACKGROUND
// =====================================================

var base = ee.Image.constant(0).visualize({
  min: 0,
  max: 1,
  palette: ['000000']
});


// =====================================================
// 10. SOUTH ASIA COUNTRY BOUNDARIES
// =====================================================

var countries = ee.FeatureCollection(
  'FAO/GAUL/2015/level0'
);

var southAsia = countries.filter(
  ee.Filter.inList(
    'ADM0_NAME',
    [
      'Afghanistan',
      'Bangladesh',
      'Bhutan',
      'India',
      'Maldives',
      'Nepal',
      'Pakistan',
      'Sri Lanka'
    ]
  )
);


// Very subtle boundaries
var boundaries = southAsia.style({
  color: '303030',
  fillColor: '00000000',
  width: 1
});


// =====================================================
// 11. DIGITAL YEAR DISPLAY
// =====================================================
//
// The year is created directly as an image using
// seven-segment digital numbers.
//
// Position: upper-right
// No fonts or external assets required.
// =====================================================

function yearGraphic(year) {

  var lon = ee.Image.pixelLonLat().select('longitude');
  var lat = ee.Image.pixelLonLat().select('latitude');

  // Four digit positions
  var x0 = 91.0;
  var digitWidth = 1.45;
  var gap = 0.25;
  var y0 = 34.0;
  var height = 2.0;

  // Width of one digit including gap
  var step = digitWidth + gap;

  // Determine which digit position this pixel belongs to
  var p0 = lon.subtract(x0).divide(step).floor();

  // Local x coordinate inside digit
  var localX = lon
    .subtract(x0)
    .subtract(p0.multiply(step))
    .divide(digitWidth);

  // Local y coordinate
  var localY = lat
    .subtract(y0)
    .divide(height);

  // Only retain the four digit area
  var inDigitArea = p0.gte(0)
    .and(p0.lt(4))
    .and(localX.gte(0))
    .and(localX.lte(1))
    .and(localY.gte(0))
    .and(localY.lte(1));


  // ---------------------------------------------------
  // Determine the actual digit
  // ---------------------------------------------------

  var digit0 = ee.Number(year)
    .divide(1000)
    .floor()
    .mod(10);

  var digit1 = ee.Number(year)
    .divide(100)
    .floor()
    .mod(10);

  var digit2 = ee.Number(year)
    .divide(10)
    .floor()
    .mod(10);

  var digit3 = ee.Number(year)
    .mod(10);


  var digit = ee.Image(0)
    .where(p0.eq(0), digit0)
    .where(p0.eq(1), digit1)
    .where(p0.eq(2), digit2)
    .where(p0.eq(3), digit3);


  // ---------------------------------------------------
  // Seven segment geometry
  // ---------------------------------------------------

  var thickness = 0.13;

  var A = localY.gte(1 - thickness)
    .and(localX.gte(0.15))
    .and(localX.lte(0.85));

  var B = localX.gte(1 - thickness)
    .and(localY.gte(0.52))
    .and(localY.lte(0.90));

  var C = localX.gte(1 - thickness)
    .and(localY.gte(0.10))
    .and(localY.lte(0.48));

  var D = localY.lte(thickness)
    .and(localX.gte(0.15))
    .and(localX.lte(0.85));

  var E = localX.lte(thickness)
    .and(localY.gte(0.10))
    .and(localY.lte(0.48));

  var F = localX.lte(thickness)
    .and(localY.gte(0.52))
    .and(localY.lte(0.90));

  var G = localY.gte(0.435)
    .and(localY.lte(0.565))
    .and(localX.gte(0.15))
    .and(localX.lte(0.85));


  // ---------------------------------------------------
  // Segment patterns
  // ---------------------------------------------------

  var segments0 = A.or(B).or(C).or(D).or(E).or(F);

  var segments1 = B.or(C);

  var segments2 = A.or(B).or(G).or(E).or(D);

  var segments3 = A.or(B).or(G).or(C).or(D);

  var segments4 = F.or(G).or(B).or(C);

  var segments5 = A.or(F).or(G).or(C).or(D);

  var segments6 = A.or(F).or(G).or(E).or(C).or(D);

  var segments7 = A.or(B).or(C);

  var segments8 = A.or(B).or(C).or(D).or(E).or(F).or(G);

  var segments9 = A.or(B).or(C).or(D).or(F).or(G);


  // Select the correct pattern
  var segments = ee.Image(0);

  segments = segments
    .where(digit.eq(0), segments0)
    .where(digit.eq(1), segments1)
    .where(digit.eq(2), segments2)
    .where(digit.eq(3), segments3)
    .where(digit.eq(4), segments4)
    .where(digit.eq(5), segments5)
    .where(digit.eq(6), segments6)
    .where(digit.eq(7), segments7)
    .where(digit.eq(8), segments8)
    .where(digit.eq(9), segments9);


  // White year
  return segments
    .and(inDigitArea)
    .selfMask()
    .visualize({
      palette: ['ffffff']
    });
}


// =====================================================
// 12. LEGEND
// =====================================================
//
// The legend is deliberately simple.
// Blue = low
// Cyan = moderate
// Yellow/orange = high
// White = very high
// =====================================================

var legendArea = ee.Geometry.Rectangle(
  [61, 6, 75, 10],
  'EPSG:4326',
  false
);


// Dark background for legend
var legendBG = ee.Image.constant(0)
  .visualize({
    palette: ['000000']
  })
  .clip(legendArea);


// Color gradient
var legendGradient = ee.Image
  .pixelLonLat()
  .select('longitude')
  .subtract(62)
  .divide(11)
  .clamp(0, 1)
  .visualize({
    min: 0,
    max: 1,
    palette: PALETTE
  })
  .clip(
    ee.Geometry.Rectangle(
      [62, 7.5, 73, 8.3],
      'EPSG:4326',
      false
    )
  );


// Legend border
var legendBorder = ee.FeatureCollection([
  ee.Feature(
    ee.Geometry.Rectangle(
      [62, 7.5, 73, 8.3],
      'EPSG:4326',
      false
    )
  )
]).style({
  color: 'ffffff',
  fillColor: '00000000',
  width: 1
});


// =====================================================
// 13. SIMPLE LEGEND NUMBERS
// =====================================================
//
// Small seven-segment numbers:
// 0 — 20 — 40 — 60
// =====================================================

function smallNumber(value, x0) {

  var lon = ee.Image.pixelLonLat().select('longitude');
  var lat = ee.Image.pixelLonLat().select('latitude');

  var w = 0.55;
  var h = 0.75;

  var localX = lon
    .subtract(x0)
    .divide(w);

  var localY = lat
    .subtract(6.35)
    .divide(h);

  var inside = localX.gte(0)
    .and(localX.lte(1))
    .and(localY.gte(0))
    .and(localY.lte(1));


  var A = localY.gte(0.85)
    .and(localX.gte(0.15))
    .and(localX.lte(0.85));

  var B = localX.gte(0.85)
    .and(localY.gte(0.5))
    .and(localY.lte(0.85));

  var C = localX.gte(0.85)
    .and(localY.gte(0.15))
    .and(localY.lte(0.5));

  var D = localY.lte(0.15)
    .and(localX.gte(0.15))
    .and(localX.lte(0.85));

  var E = localX.lte(0.15)
    .and(localY.gte(0.15))
    .and(localY.lte(0.5));

  var F = localX.lte(0.15)
    .and(localY.gte(0.5))
    .and(localY.lte(0.85));

  var G = localY.gte(0.43)
    .and(localY.lte(0.57))
    .and(localX.gte(0.15))
    .and(localX.lte(0.85));


  var digit = ee.Image(0);

  if (value === 0) {
    digit = A.or(B).or(C).or(D).or(E).or(F);
  }

  return digit
    .and(inside)
    .selfMask()
    .visualize({
      palette: ['ffffff']
    });
}


// =====================================================
// 14. LEGEND
// =====================================================

var legend = legendBG
  .blend(legendGradient)
  .blend(legendBorder)
  .blend(smallNumber(0, 61.4))
  .blend(smallNumber(0, 72.0));


// =====================================================
// 15. DMSP FRAMES
// =====================================================

var dmspYears = ee.List.sequence(
  2010,
  2013
);


var dmspFrames = ee.ImageCollection(
  dmspYears.map(function(year) {

    year = ee.Number(year);

    var lights = visualizeDMSP(
      getDMSP(year)
    );

    var yearImage = yearGraphic(
      year
    );

    return base
      .blend(lights)
      .blend(boundaries)
      .blend(legend)
      .blend(yearImage)
      .set('year', year)
      .set('sensor', 'DMSP-OLS');

  })
);


// =====================================================
// 16. VIIRS FRAMES
// =====================================================

var viirsYears = ee.List.sequence(
  2014,
  2025
);


var viirsFrames = ee.ImageCollection(
  viirsYears.map(function(year) {

    year = ee.Number(year);

    var lights = visualizeVIIRS(
      getVIIRS(year)
    );

    var yearImage = yearGraphic(
      year
    );

    return base
      .blend(lights)
      .blend(boundaries)
      .blend(legend)
      .blend(yearImage)
      .set('year', year)
      .set('sensor', 'VIIRS');

  })
);


// =====================================================
// 17. COMBINE FRAMES
// =====================================================

var frames = dmspFrames.merge(
  viirsFrames
);


// =====================================================
// 18. CHECK
// =====================================================

print(
  'TOTAL ANIMATION FRAMES:',
  frames.size()
);

print(
  'YEARS:',
  frames.aggregate_array('year')
);

print(
  'SENSORS:',
  frames.aggregate_array('sensor')
);


// =====================================================
// 19. GIF PARAMETERS
// =====================================================

var gifParams = {

  region: region,

  dimensions: DIMENSIONS,

  framesPerSecond: FPS,

  crs: 'EPSG:3857',

  format: 'gif'
};


// =====================================================
// 20. GIF PREVIEW
// =====================================================

print(
  ui.Thumbnail(
    frames,
    gifParams
  )
);


// =====================================================
// 21. GIF URL
// =====================================================

print(
  'GIF URL:',
  frames.getVideoThumbURL(
    gifParams
  )
);


// =====================================================
// 22. MAP PREVIEW
// =====================================================

Map.setCenter(
  80,
  22,
  4
);


Map.addLayer(
  visualizeDMSP(
    getDMSP(2013)
  ),
  {},
  'DMSP 2013'
);


Map.addLayer(
  visualizeVIIRS(
    getVIIRS(2025)
  ),
  {},
  'VIIRS 2025'
);