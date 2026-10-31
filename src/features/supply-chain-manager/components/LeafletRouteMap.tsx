import React, { useEffect, useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import { WebView as RNWebView } from 'react-native-webview';
import type { OrderRoute } from '../types';

// The library's class types don't match React 19's JSX types.
const WebView = RNWebView as unknown as React.ComponentType<any>;

interface LeafletRouteMapProps {
  routes: OrderRoute[];
  selectedRouteId: string | null;
  onSelectRoute: (routeId: string) => void;
  onSelectStop: (orderId: string, stopId: string) => void;
}

const STOP_COLORS: Record<string, string> = { supplier: '#0D9488', warehouse: '#D97706', distribution: '#2563EB', customer: '#7C3AED' };

function buildHtml(routes: OrderRoute[]) {
  const data = routes.map((r) => ({
    id: r.orderId, color: r.routeColor, delayed: r.status === 'Delayed',
    line: r.coordinates.map((c) => [c.latitude, c.longitude]),
    stops: r.stops.map((s) => ({ id: s.id, type: s.type, name: s.name, location: s.location, at: [s.coordinate.latitude, s.coordinate.longitude] })),
  }));
  // Stops "</script>" in a name from ending the script early.
  const json = JSON.stringify(data).replace(/</g, '\\u003c');
  return `<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1,maximum-scale=1">
<link rel="stylesheet" href="https://unpkg.com/leaflet@1.9.4/dist/leaflet.css"/>
<style>html,body,#map{height:100%;margin:0}</style></head><body><div id="map"></div>
<script src="https://unpkg.com/leaflet@1.9.4/dist/leaflet.js"></script>
<script>
var send=function(m){window.ReactNativeWebView.postMessage(JSON.stringify(m))};
var routes=${json},colors=${JSON.stringify(STOP_COLORS)},lines={};
var map=L.map('map').setView([21,78.5],5);
L.tileLayer('https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap &copy; CARTO'}).addTo(map);
var all=[];
routes.forEach(function(r){
  if(r.line.length){
    lines[r.id]=L.polyline(r.line,{color:r.color,weight:3,dashArray:r.delayed?'8 6':null}).addTo(map).on('click',function(){send({route:r.id})});
    all=all.concat(r.line);
  }
  r.stops.forEach(function(s){
    L.circleMarker(s.at,{radius:8,color:'#fff',weight:2,fillColor:colors[s.type]||'#2563EB',fillOpacity:1}).addTo(map)
      .bindPopup('<b>'+s.name.replace(/</g,'&lt;')+'</b><br>'+s.location.replace(/</g,'&lt;'))
      .on('click',function(){send({route:r.id,stop:s.id})});
    all.push(s.at);
  });
});
if(all.length)map.fitBounds(all,{padding:[30,30]});
window.selectRoute=function(id){
  Object.keys(lines).forEach(function(k){lines[k].setStyle({weight:k===id?6:3,color:k===id?'#0D9488':routes.filter(function(r){return r.id===k})[0].color})});
  if(id&&lines[id]){lines[id].bringToFront();map.fitBounds(lines[id].getBounds(),{padding:[40,40]})}
};
</script></body></html>`;
}

/** A keyless map, so a release build doesn't depend on a Google Maps API key. */
export const LeafletRouteMap: React.FC<LeafletRouteMapProps> = ({ routes, selectedRouteId, onSelectRoute, onSelectStop }) => {
  const webRef = useRef<RNWebView | null>(null);
  const html = useMemo(() => buildHtml(routes), [routes]);

  useEffect(() => {
    webRef.current?.injectJavaScript(`window.selectRoute&&window.selectRoute(${JSON.stringify(selectedRouteId)});true;`);
  }, [selectedRouteId]);

  return (
    <View style={styles.container}>
      <WebView
        ref={webRef}
        originWhitelist={['*']}
        source={{ html, baseUrl: 'https://trustchain.app' }}
        style={styles.map}
        onMessage={(event: { nativeEvent: { data: string } }) => {
          const message = JSON.parse(event.nativeEvent.data) as { route: string; stop?: string };
          onSelectRoute(message.route);
          if (message.stop) onSelectStop(message.route, message.stop);
        }}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#E2E8F0' },
  map: { flex: 1 },
});

export default LeafletRouteMap;
