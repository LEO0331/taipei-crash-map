import { createHash } from 'node:crypto';
import { gunzipSync } from 'node:zlib';
import { readFile, writeFile, mkdir, rename } from 'node:fs/promises';
import path from 'node:path';
export const BUS_RAW_DIR = path.resolve('data/raw/bus-service');
export const BUS_OUTPUT_DIR = path.resolve('public/data/bus-service');
export const BUS_SOURCE_IDS = ['Route', 'Stop', 'StopLocation', 'PathDetail', 'SemiTimeTable', 'TimeTable', 'BusShape', 'SpecTimeTable'] as const;
export type BusSourceId = typeof BUS_SOURCE_IDS[number];
export const BUS_SOURCES = BUS_SOURCE_IDS.map(id => ({ id, url: `https://tcgbusfs.blob.core.windows.net/blobbus/Get${id}.gz` }));
export const COMPRESSED_LIMIT = 16 * 1024 * 1024;
export const DECOMPRESSED_LIMIT = 64 * 1024 * 1024;
export const sha256 = (data: Uint8Array | string) => createHash('sha256').update(data).digest('hex');
export type RawRecord = Record<string, unknown>;
export interface BusRetainedSource { id: BusSourceId; url: string; file: string; sha256: string; bytes: number; decodedBytes: number; recordCount: number; retrievedAt: string; sourceUpdatedAt: string | null; lastModified: string | null; httpStatus: number; schemaVersion: 'pto-api-v6.3'; }
export interface BusAcquisitionManifest { schemaVersion: '1.0.0'; sources: BusRetainedSource[]; }
export function busCoordinate(value:unknown,limit:number):number|null {
  if((typeof value!=='string'&&typeof value!=='number')||(typeof value==='string'&&!value.trim()))return null;
  const n=Number(value);return Number.isFinite(n)&&Math.abs(n)<=limit?n:null;
}
export function validBusWkt(value:unknown):boolean {
  if(typeof value!=='string')return false;
  const match=/^LINESTRING\s*\(([^()]+)\)$/i.exec(value.trim());if(!match)return false;
  const points=match[1].split(',');return points.length>=2&&points.every(point=>{const pair=point.trim().split(/\s+/);return pair.length===2&&pair.every(v=>/^[+-]?(?:\d+(?:\.\d*)?|\.\d+)(?:[eE][+-]?\d+)?$/.test(v))&&busCoordinate(pair[0],180)!==null&&busCoordinate(pair[1],90)!==null;});
}
export function decodeBusSource(id: BusSourceId, bytes: Buffer): { records: RawRecord[]; decodedBytes: number; sourceUpdatedAt: string | null } {
  if (bytes.length > COMPRESSED_LIMIT || bytes[0] !== 0x1f || bytes[1] !== 0x8b) throw new Error(`${id}: expected bounded gzip`);
  const text = gunzipSync(bytes, { maxOutputLength: DECOMPRESSED_LIMIT });
  const root = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(text).replace(/^\uFEFF/, ''));
  const records = id === 'BusShape' ? root : id === 'SpecTimeTable' ? root.specificTimeTables?.specificTimeTable : root.BusInfo;
  if (!Array.isArray(records) || !records.length || records.some(row => !row || typeof row !== 'object' || Array.isArray(row))) throw new Error(`${id}: invalid record envelope`);
  const required: Record<BusSourceId, string[]> = { Route: ['Id', 'pathAttributeId', 'providerId', 'nameZh'], Stop: ['Id', 'routeId', 'goBack', 'stopLocationId'], StopLocation: ['id', 'lon', 'lat'], PathDetail: ['id', 'pathAttributeId', 'stopId', 'sequenceNo'], SemiTimeTable: ['Id', 'PathAttributeId', 'DateType', 'DateValue'], TimeTable: ['Id', 'PathAttributeId', 'DepartureTime'], BusShape: ['RouteID', 'SubRouteID', 'GoBack', 'wkt'], SpecTimeTable: ['routeID', 'subRouteID', 'timeTables'] };
  if (records.some(row => required[id].some(key => !(key in row)))) throw new Error(`${id}: schema fields missing`);
  const numericIds: Partial<Record<BusSourceId,string[]>> = {Route:['Id','pathAttributeId','providerId'],Stop:['Id','routeId','stopLocationId'],StopLocation:['id'],PathDetail:['id','pathAttributeId','stopId'],SemiTimeTable:['Id','PathAttributeId'],TimeTable:['Id','PathAttributeId'],BusShape:['RouteID','SubRouteID'],SpecTimeTable:['routeID','subRouteID']};
  if(records.some(row=>(numericIds[id]??[]).some(key=>!/^\d+$/.test(String(row[key])) && !(id==='BusShape'&&key==='SubRouteID'&&row[key]===-1))))throw new Error(`${id}: invalid native identifiers`);
  const primaryKey: Partial<Record<BusSourceId,string>> = {Stop:'Id',StopLocation:'id',PathDetail:'id',SemiTimeTable:'Id',TimeTable:'Id'};
  const key=primaryKey[id];if(key&&new Set(records.map(row=>String(row[key]))).size!==records.length)throw new Error(`${id}: duplicate primary identifiers`);
  if(id!=='SpecTimeTable'&&records.some(row=>Object.values(row).some(value=>value!==null&&typeof value==='object')))throw new Error(`${id}: unexpected nested static field`);
  if(id==='Route'&&records.some(row=>typeof row.nameZh!=='string'||typeof row.nameEn!=='string'||typeof row.pathAttributeName!=='string'))throw new Error('Route: invalid route names');
  if(id==='PathDetail'&&records.some(row=>!Number.isInteger(row.sequenceNo)||Number(row.sequenceNo)<0))throw new Error('PathDetail: invalid sequence number');
  if(id!=='BusShape'&&id!=='SpecTimeTable'&&(!root.EssentialInfo||typeof root.EssentialInfo.UpdateTime!=='string'||root.EssentialInfo.CoordinateSystem!=='WGS84'))throw new Error(`${id}: invalid metadata envelope`);
  const sourceUpdatedAt = id === 'BusShape' ? null : id === 'SpecTimeTable' ? new Date(root.updateTime).toISOString() : root.EssentialInfo?.UpdateTime ?? null;
  return { records, decodedBytes: text.length, sourceUpdatedAt };
}
export async function atomicJson(file: string, value: unknown) { await mkdir(path.dirname(file), { recursive: true }); const pending = `${file}.pending`; await writeFile(pending, JSON.stringify(value) + '\n'); await rename(pending, file); }
export async function immutableWrite(file:string,bytes:Uint8Array|string) {
  await mkdir(path.dirname(file),{recursive:true});
  try { const existing=await readFile(file);if(sha256(existing)!==sha256(bytes))throw new Error('Immutable artifact collision');return; }
  catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error;}
  const pending=`${file}.pending`;await writeFile(pending,bytes);await rename(pending,file);
}
export async function readBusSources(rawDir = BUS_RAW_DIR) {
  const manifest: BusAcquisitionManifest = JSON.parse(await readFile(path.join(rawDir, 'manifest.json'), 'utf8'));
  if (manifest.schemaVersion !== '1.0.0' || !Array.isArray(manifest.sources) || manifest.sources.length !== BUS_SOURCE_IDS.length || new Set(manifest.sources.map(s => s.id)).size !== BUS_SOURCE_IDS.length) throw new Error('Invalid acquisition manifest');
  const records = {} as Record<BusSourceId, RawRecord[]>;
  for (const source of manifest.sources) {
    if (!BUS_SOURCES.some(s => s.id === source.id && s.url === source.url) || !/^[a-f0-9]{64}\.gz$/.test(source.file)) throw new Error('Invalid retained source path or allowlist');
    if(source.schemaVersion!=='pto-api-v6.3'||source.httpStatus!==200||!/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z$/.test(source.retrievedAt)||!Number.isFinite(Date.parse(source.retrievedAt))||source.file!==`${source.sha256}.gz`)throw new Error('Invalid retained provenance');
    const bytes = await readFile(path.join(rawDir, source.file));
    if (sha256(bytes) !== source.sha256 || bytes.length !== source.bytes) throw new Error(`${source.id}: retained hash mismatch`);
    const decoded = decodeBusSource(source.id, bytes);
    if (decoded.records.length !== source.recordCount || decoded.decodedBytes !== source.decodedBytes || decoded.sourceUpdatedAt !== source.sourceUpdatedAt) throw new Error(`${source.id}: retained contract mismatch`);
    records[source.id] = decoded.records;
  }
  return { manifest, records };
}
