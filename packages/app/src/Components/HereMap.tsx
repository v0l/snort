/* eslint-disable @typescript-eslint/ban-ts-comment */
import H from "@here/maps-api-for-javascript";
import { useEffect, useRef } from "react";

export default function HereMap(props: {
  zoom?: number;
  markers?: Array<{ lat: number; lng: number }>;
  center?: { lat: number; lng: number };
}) {
  const mapRef = useRef(null);
  const map = useRef<H.Map>(null);
  const platform = useRef<H.service.Platform>(null);

  useEffect(() => {
    if (!map.current) {
      //@ts-expect-error
      platform.current = new H.service.Platform({ apikey: "5uZZsWJdVyMSDTjjNJNyUgKq_bKv2rVVZWAXnfmgttQ" });

      const rasterTileService = platform.current.getRasterTileService({
        queryParams: {
          style: "explore.night",
          size: 512,
        },
      });
      const rasterTileProvider = new H.service.rasterTile.Provider(rasterTileService);
      const rasterTileLayer = new H.map.layer.TileLayer(rasterTileProvider);

      const newMap = new H.Map(mapRef.current!, rasterTileLayer, {
        engineType: H.Map.EngineType.WEBGL,
        pixelRatio: window.devicePixelRatio,
        center: props.center ?? { lat: 0, lng: 0 },
        zoom: props.zoom ?? 2,
      });

      new H.mapevents.Behavior(new H.mapevents.MapEvents(newMap));
      //@ts-expect-error
      map.current = newMap;
    }
  }, [props]);

  useEffect(() => {
    if (map.current) {
      map.current.setCenter(props.center ?? { lat: 0, lng: 0 });
      map.current.setZoom(props.zoom ?? 2);
      map.current.removeObjects(map.current.getObjects());
      for (const mrk of props.markers ?? []) {
        const m = new H.map.Marker(mrk);
        map.current.addObject(m);
      }
    }
  }, [map, props.center, props.zoom, props.markers]);

  // Return a div element to hold the map
  return <div style={{ width: "100%", height: "300px" }} className="rounded-xl overflow-hidden" ref={mapRef} />;
}
