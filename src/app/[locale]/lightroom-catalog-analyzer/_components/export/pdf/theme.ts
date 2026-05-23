import { StyleSheet } from '@react-pdf/renderer'

/** Brand accent — analyzer's --accent token (dark theme), static for PDF. */
export const BRAND_ACCENT = '#f59e0b'
export const INK = '#1a1a1a'
export const MUTED = '#666666'
export const RULE = '#d4d4d4'

export const pdfStyles = StyleSheet.create({
  page: { paddingTop: 48, paddingBottom: 56, paddingHorizontal: 48, fontSize: 12, color: INK, fontFamily: 'Helvetica' },
  h1: { fontSize: 26, fontFamily: 'Helvetica-Bold', color: INK, marginBottom: 8 },
  h2: { fontSize: 16, fontFamily: 'Helvetica-Bold', color: BRAND_ACCENT, marginBottom: 8, marginTop: 4 },
  body: { fontSize: 12, lineHeight: 1.4, marginBottom: 3 },
  muted: { fontSize: 10, color: MUTED },
  tile: { fontSize: 12, marginBottom: 4 },
  tileLabel: { fontSize: 9, color: MUTED, textTransform: 'uppercase', letterSpacing: 0.5 },
  tileValue: { fontSize: 14, fontFamily: 'Helvetica-Bold' },
  tileGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12, marginBottom: 12 },
  tileCell: { width: '30%', marginBottom: 8 },
  chart: { width: 500, height: 250, marginVertical: 12, objectFit: 'contain' },
  table: { marginTop: 8 },
  tr: { flexDirection: 'row', borderBottomWidth: 0.5, borderBottomColor: RULE, paddingVertical: 3 },
  th: { fontFamily: 'Helvetica-Bold', fontSize: 11 },
  td: { fontSize: 11 },
  cellWide: { flex: 2 },
  cell: { flex: 1 },
  footer: { position: 'absolute', bottom: 24, left: 48, right: 48, flexDirection: 'row', justifyContent: 'space-between', fontSize: 9, color: MUTED, borderTopWidth: 0.5, borderTopColor: RULE, paddingTop: 6 },
  coverMeta: { marginTop: 24 },
  coverRule: { height: 3, width: 64, backgroundColor: BRAND_ACCENT, marginVertical: 16 },
})
