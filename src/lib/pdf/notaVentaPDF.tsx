import React from 'react'
import {
  Document,
  Page,
  Text,
  View,
  StyleSheet,
  Image,
} from '@react-pdf/renderer'
import { formatCurrency } from '@/utils/formatters'
import { numeroALetras } from '@/utils/numeroALetras'

export interface NotaVentaDetalle {
  descripcion: string
  cod_producto: string | null
  cantidad: number
  mto_precio_unitario: number
  mto_valor_venta: number
  unidad_codigo: string
  descuento: number | null
}

export interface NotaVentaPDFData {
  serie_numero: string
  fecha_emision: string
  empresa_razon_social: string
  empresa_ruc: string
  empresa_direccion: string | null
  empresa_logo_url: string | null
  cliente_nombre: string
  cliente_tipo_doc: string | null
  cliente_numero_doc: string | null
  cliente_direccion: string | null
  detalles: NotaVentaDetalle[]
  subtotal: number
  igv: number
  total: number
  descuento_global: number
  aplica_igv: boolean
  terminos_condiciones: string | null
}

const s = StyleSheet.create({
  page: {
    fontFamily: 'Helvetica',
    fontSize: 9,
    paddingTop: 30,
    paddingBottom: 50,
    paddingHorizontal: 40,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 16,
    paddingBottom: 14,
    borderBottom: '1pt solid #cbd5e1',
  },
  logo: { width: 56, height: 56, objectFit: 'contain' },
  companyBlock: { flex: 1, paddingLeft: 10 },
  companyName: {
    fontSize: 12,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginBottom: 3,
  },
  companyDetail: { fontSize: 8, color: '#475569', marginTop: 2 },
  docBox: {
    width: 175,
    border: '2pt solid #0f172a',
    borderRadius: 4,
    padding: '10pt 12pt',
    alignItems: 'center',
  },
  docTitle: {
    fontSize: 11,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    letterSpacing: 0.8,
  },
  docDivider: {
    width: 145,
    height: 1,
    backgroundColor: '#0f172a',
    marginVertical: 5,
  },
  docSerie: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  docFecha: { fontSize: 8, color: '#475569', marginTop: 3 },
  clientBox: {
    border: '1pt solid #e2e8f0',
    borderRadius: 4,
    padding: '8pt 12pt',
    marginBottom: 14,
  },
  clientSectionLabel: {
    fontSize: 7,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  clientGrid: { flexDirection: 'row', gap: 16 },
  clientLabel: { fontSize: 7.5, color: '#94a3b8' },
  clientValue: {
    fontSize: 9,
    fontFamily: 'Helvetica-Bold',
    color: '#0f172a',
    marginTop: 1,
  },
  tableWrapper: { marginBottom: 14 },
  tableHead: {
    flexDirection: 'row',
    backgroundColor: '#1e293b',
    padding: '5pt 8pt',
  },
  tableHeadCell: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#f8fafc',
  },
  tableRow: {
    flexDirection: 'row',
    padding: '5pt 8pt',
    borderBottom: '0.5pt solid #e2e8f0',
  },
  tableRowAlt: { backgroundColor: '#f8fafc' },
  tableCell: { fontSize: 8.5, color: '#1a1a1a' },
  tableCellMuted: { fontSize: 7.5, color: '#64748b' },
  colNum: { width: '5%' },
  colDesc: { flex: 1 },
  colQty: { width: '8%', textAlign: 'right' },
  colUnit: { width: '10%', textAlign: 'center' },
  colPrice: { width: '14%', textAlign: 'right' },
  colTotal: { width: '14%', textAlign: 'right' },
  totalsSection: { alignSelf: 'flex-end', width: 220, marginBottom: 12 },
  totalsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 3,
  },
  totalsLabel: { fontSize: 8.5, color: '#475569' },
  totalsValue: { fontSize: 8.5, color: '#1a1a1a' },
  totalsFinalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 5,
    paddingTop: 5,
    borderTop: '1.5pt solid #0f172a',
  },
  totalsFinalLabel: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  totalsFinalValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#0f172a' },
  leyendaBox: {
    border: '1pt solid #e2e8f0',
    borderRadius: 3,
    padding: '6pt 10pt',
    marginBottom: 12,
  },
  leyendaText: { fontSize: 8, color: '#475569', fontStyle: 'italic' },
  terminosLabel: {
    fontSize: 7.5,
    fontFamily: 'Helvetica-Bold',
    color: '#64748b',
    textTransform: 'uppercase',
    marginBottom: 3,
  },
  terminosText: { fontSize: 8, color: '#475569' },
  footer: {
    position: 'absolute',
    bottom: 20,
    left: 40,
    right: 40,
    borderTop: '0.5pt solid #e2e8f0',
    paddingTop: 5,
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  footerText: { fontSize: 7, color: '#94a3b8' },
})

function formatDate(iso: string): string {
  const clean = iso.split('T')[0]
  const [y, m, d] = clean.split('-')
  return `${d}/${m}/${y}`
}

export function NotaVentaDocument({ data }: { data: NotaVentaPDFData }) {
  return (
    <Document>
      <Page size="A4" style={s.page}>
        {/* Header */}
        <View style={s.header}>
          <View style={{ flexDirection: 'row', flex: 1 }}>
            {data.empresa_logo_url && (
              <Image src={data.empresa_logo_url} style={s.logo} />
            )}
            <View style={[s.companyBlock, !data.empresa_logo_url ? { paddingLeft: 0 } : {}]}>
              <Text style={s.companyName}>{data.empresa_razon_social}</Text>
              <Text style={s.companyDetail}>RUC: {data.empresa_ruc}</Text>
              {data.empresa_direccion && (
                <Text style={s.companyDetail}>{data.empresa_direccion}</Text>
              )}
            </View>
          </View>
          <View style={s.docBox}>
            <Text style={s.docTitle}>NOTA DE VENTA</Text>
            <View style={s.docDivider} />
            <Text style={s.docSerie}>{data.serie_numero}</Text>
            <Text style={s.docFecha}>Fecha: {formatDate(data.fecha_emision)}</Text>
          </View>
        </View>

        {/* Cliente */}
        <View style={s.clientBox}>
          <Text style={s.clientSectionLabel}>Datos del Cliente</Text>
          <View style={s.clientGrid}>
            <View style={{ flex: 2 }}>
              <Text style={s.clientLabel}>Nombre / Razón Social</Text>
              <Text style={s.clientValue}>{data.cliente_nombre}</Text>
            </View>
            {data.cliente_numero_doc && (
              <View style={{ flex: 1 }}>
                <Text style={s.clientLabel}>
                  {data.cliente_tipo_doc?.toUpperCase() ?? 'Documento'}
                </Text>
                <Text style={s.clientValue}>{data.cliente_numero_doc}</Text>
              </View>
            )}
          </View>
          {data.cliente_direccion && (
            <View style={{ marginTop: 6 }}>
              <Text style={s.clientLabel}>Dirección</Text>
              <Text style={[s.clientValue, { fontFamily: 'Helvetica' }]}>
                {data.cliente_direccion}
              </Text>
            </View>
          )}
        </View>

        {/* Tabla de ítems */}
        <View style={s.tableWrapper}>
          <View style={s.tableHead}>
            <Text style={[s.tableHeadCell, s.colNum]}>#</Text>
            <Text style={[s.tableHeadCell, s.colDesc]}>Descripción</Text>
            <Text style={[s.tableHeadCell, s.colQty]}>Cant.</Text>
            <Text style={[s.tableHeadCell, s.colUnit]}>Unidad</Text>
            <Text style={[s.tableHeadCell, s.colPrice]}>P. Unit.</Text>
            <Text style={[s.tableHeadCell, s.colTotal]}>Total</Text>
          </View>
          {data.detalles.map((item, i) => (
            <View
              key={i}
              style={[s.tableRow, i % 2 === 1 ? s.tableRowAlt : {}]}
            >
              <Text style={[s.tableCellMuted, s.colNum]}>{i + 1}</Text>
              <View style={s.colDesc}>
                <Text style={s.tableCell}>{item.descripcion}</Text>
                {item.cod_producto && (
                  <Text style={s.tableCellMuted}>SKU: {item.cod_producto}</Text>
                )}
              </View>
              <Text style={[s.tableCell, s.colQty]}>{item.cantidad}</Text>
              <Text style={[s.tableCellMuted, s.colUnit]}>{item.unidad_codigo}</Text>
              <Text style={[s.tableCell, s.colPrice]}>
                {formatCurrency(item.mto_precio_unitario)}
              </Text>
              <Text style={[s.tableCell, s.colTotal]}>
                {formatCurrency(item.mto_valor_venta)}
              </Text>
            </View>
          ))}
        </View>

        {/* Totales */}
        <View style={s.totalsSection}>
          {data.descuento_global > 0 && (
            <View style={s.totalsRow}>
              <Text style={s.totalsLabel}>Descuento:</Text>
              <Text style={s.totalsValue}>- {formatCurrency(data.descuento_global)}</Text>
            </View>
          )}
          {data.aplica_igv && (
            <>
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>Subtotal:</Text>
                <Text style={s.totalsValue}>{formatCurrency(data.subtotal)}</Text>
              </View>
              <View style={s.totalsRow}>
                <Text style={s.totalsLabel}>IGV (18%):</Text>
                <Text style={s.totalsValue}>{formatCurrency(data.igv)}</Text>
              </View>
            </>
          )}
          <View style={s.totalsFinalRow}>
            <Text style={s.totalsFinalLabel}>TOTAL:</Text>
            <Text style={s.totalsFinalValue}>{formatCurrency(data.total)}</Text>
          </View>
        </View>

        {/* Monto en letras */}
        <View style={s.leyendaBox}>
          <Text style={s.leyendaText}>{numeroALetras(data.total)}</Text>
        </View>

        {/* Términos y condiciones */}
        {data.terminos_condiciones && (
          <View style={{ marginBottom: 12 }}>
            <Text style={s.terminosLabel}>Términos y Condiciones</Text>
            <Text style={s.terminosText}>{data.terminos_condiciones}</Text>
          </View>
        )}

        {/* Footer fijo */}
        <View style={s.footer} fixed>
          <Text style={s.footerText}>
            {data.serie_numero} · {data.empresa_razon_social}
          </Text>
          <Text style={s.footerText}>
            Documento no válido como comprobante de pago fiscal.
          </Text>
        </View>
      </Page>
    </Document>
  )
}
