import { useEffect } from 'react'
import {
  MapContainer,
  Marker,
  TileLayer,
  useMap,
  useMapEvents
} from 'react-leaflet'

import L from 'leaflet'
import 'leaflet/dist/leaflet.css'

import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png'
import markerIcon from 'leaflet/dist/images/marker-icon.png'
import markerShadow from 'leaflet/dist/images/marker-shadow.png'

// Fix Leaflet marker icons in Vite
delete L.Icon.Default.prototype._getIconUrl

L.Icon.Default.mergeOptions({
  iconRetinaUrl: markerIcon2x,
  iconUrl: markerIcon,
  shadowUrl: markerShadow
})

const DEFAULT_POSITION = [7.2906, 80.6337]

function MapClickHandler({ onLocationSelect }) {
  useMapEvents({
    click(event) {
      onLocationSelect(event.latlng.lat, event.latlng.lng)
    }
  })

  return null
}

function ChangeMapView({ position }) {
  const map = useMap()

  useEffect(() => {
    if (position) {
      map.setView(position, 14)
    }
  }, [position, map])

  return null
}

export default function StationLocationMap({
  latitude,
  longitude,
  onLocationSelect
}) {
  const hasLocation =
    latitude !== '' &&
    longitude !== '' &&
    Number.isFinite(Number(latitude)) &&
    Number.isFinite(Number(longitude))

  const position = hasLocation
    ? [Number(latitude), Number(longitude)]
    : DEFAULT_POSITION

  return (
    <div className="overflow-hidden rounded-xl border border-slate-200">
      <MapContainer
        center={position}
        zoom={13}
        scrollWheelZoom
        className="h-[320px] w-full"
      >
        <TileLayer
          attribution="&copy; OpenStreetMap contributors"
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        />

        <MapClickHandler onLocationSelect={onLocationSelect} />

        <ChangeMapView position={position} />

        {hasLocation && (
          <Marker
            position={position}
            draggable
            eventHandlers={{
              dragend(event) {
                const marker = event.target
                const location = marker.getLatLng()

                onLocationSelect(location.lat, location.lng)
              }
            }}
          />
        )}
      </MapContainer>
    </div>
  )
}