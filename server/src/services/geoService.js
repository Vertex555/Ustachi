const { ApiError } = require('../utils/ApiError');

/**
 * Distance helpers using the haversine formula (meters).
 * Production matching uses MongoDB $geoNear / 2dsphere indexes.
 */
const EARTH_RADIUS_M = 6371000;

function toRad(deg) {
  return (deg * Math.PI) / 180;
}

function haversineMeters([lng1, lat1], [lng2, lat2]) {
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return 2 * EARTH_RADIUS_M * Math.asin(Math.sqrt(a));
}

function validateCoords(coords, label = 'coordinates') {
  if (!Array.isArray(coords) || coords.length < 2) {
    throw new ApiError(400, `${label} must be [lng, lat]`, 'INVALID_COORDS');
  }
  const [lng, lat] = coords;
  if (lng < -180 || lng > 180 || lat < -90 || lat > 90) {
    throw new ApiError(400, `${label} out of range`, 'INVALID_COORDS');
  }
  return [Number(lng), Number(lat)];
}

module.exports = { haversineMeters, validateCoords };
