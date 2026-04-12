'use client';
import { Document, Page, Text, View, StyleSheet, Image } from '@react-pdf/renderer';
import type { QuoteFormData, QuoteLineItem } from '@/services/quotes.service';
import type { Client } from '@/services/clients.service';
import type { CompanyConfig } from '@/services/companyConfig.service';
import type { Product } from '@/services/products.service';
import { formatCurrency, type QuoteTotals } from './quoteForm.utils';

const S = StyleSheet.create({
  page: { padding: 28, fontFamily: 'Helvetica', fontSize: 9, color: '#475467', backgroundColor: '#F3F4F6' },
  container: { backgroundColor: 'white', padding: 24, borderRadius: 10 },

  /* ─── Header ─── */
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20 },
  companyBlock: { width: '34%' },
  logoImage: { width: 60, height: 60, marginBottom: 8, objectFit: 'contain' },
  logoText: { fontSize: 32, fontFamily: 'Helvetica-Oblique', color: '#111827', marginBottom: 2 },
  companySubName: { fontSize: 7.5, color: '#767491', marginBottom: 10 },
  companyName: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 6 },
  contactLine: { flexDirection: 'row', marginBottom: 3 },
  contactText: { fontSize: 8.5, color: '#767491' },

  headerCenter: { width: '28%', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 6 },
  headerCenterText: { fontSize: 9, textAlign: 'center', textTransform: 'uppercase', color: '#475467', lineHeight: 1.5 },

  docBox: { width: '32%', backgroundColor: '#004A99', borderRadius: 10, padding: 14, alignItems: 'center', justifyContent: 'center' },
  docRuc: { fontSize: 10, color: 'white', marginBottom: 6 },
  docTitle: { fontSize: 20, color: 'white', marginBottom: 6 },
  docNumber: { fontSize: 12, color: 'white' },

  /* ─── Detail Cards ─── */
  cardsRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  card: { width: '48.5%', border: '1pt solid #E5E7EB', borderRadius: 8, padding: 12 },
  cardHeader: { borderBottom: '1pt solid #F3F4F6', paddingBottom: 6, marginBottom: 10 },
  cardTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  gridRow: { flexDirection: 'row', marginBottom: 6 },
  gridLabel: { width: 100, fontSize: 8, color: '#767491', textTransform: 'uppercase' },
  gridValue: { flex: 1, fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },

  /* ─── Table ─── */
  tableWrapper: { border: '1pt solid #E5E7EB', borderRadius: 8, overflow: 'hidden', marginBottom: 16 },
  tableHead: { flexDirection: 'row', backgroundColor: '#004A99', paddingVertical: 9, paddingHorizontal: 8 },
  thCell: { color: 'white', fontSize: 8.5, textAlign: 'center', fontFamily: 'Helvetica-Bold' },
  tableRow: { flexDirection: 'row', borderBottom: '1pt solid #E5E7EB', paddingVertical: 10, paddingHorizontal: 8 },
  tdCell: { fontSize: 9, textAlign: 'center', color: '#111827' },
  colQty:   { width: '10%' },
  colDesc:  { width: '44%', textAlign: 'left' },
  colCode:  { width: '14%' },
  colPrice: { width: '16%' },
  colSub:   { width: '16%' },

  /* ─── Totals ─── */
  totalsRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 },
  totalsTitle: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#111827', marginTop: 8 },
  totalsBox: { width: '44%', backgroundColor: '#F9FAFB', border: '1pt solid #E5E7EB', borderRadius: 8, padding: 14 },
  totalsLine: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  tLabel: { fontSize: 8.5, color: '#767491' },
  tValue: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#111827' },
  tDiscount: { fontSize: 9, fontFamily: 'Helvetica-Bold', color: '#EF4444' },
  tDivider: { borderBottom: '1pt solid #E5E7EB', marginVertical: 6 },
  tFinalLabel: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827' },
  tFinalValue: { fontSize: 14, fontFamily: 'Helvetica-Bold', color: '#004A99' },

  /* ─── Info Cards ─── */
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 },
  infoCard: { width: '48.5%', border: '1pt solid #E5E7EB', borderRadius: 8, padding: 12 },
  infoTitle: { fontSize: 11, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 8 },
  infoText: { fontSize: 8.5, color: '#475467', lineHeight: 1.5, marginBottom: 4 },

  /* ─── Banks ─── */
  banksWrapper: { border: '1pt solid #E5E7EB', borderRadius: 8, overflow: 'hidden' },
  banksHeader: { backgroundColor: '#004A99', paddingVertical: 9, paddingHorizontal: 12 },
  banksHeaderText: { color: 'white', fontSize: 10, textAlign: 'center' },
  banksBody: { flexDirection: 'row' },
  bankCol: { flex: 1, padding: 14 },
  bankColBorder: { borderRight: '1pt solid #E5E7EB' },
  bankName: { fontSize: 12, fontFamily: 'Helvetica-Bold', color: '#111827', marginBottom: 2 },
  bankSub: { fontSize: 7.5, color: '#767491', textTransform: 'uppercase', marginBottom: 12 },
  accountBlock: { marginBottom: 10 },
  accountLabel: { fontSize: 7.5, color: '#767491', marginBottom: 3 },
  accountValueBox: { backgroundColor: '#F9FAFB', border: '1pt solid #F3F4F6', borderRadius: 6, padding: 8 },
  accountValue: { fontSize: 10, fontFamily: 'Helvetica-Bold', color: '#111827' },
});

export interface QuotePDFTemplateProps {
  quoteData: QuoteFormData;
  totals: QuoteTotals;
  lineItems: QuoteLineItem[];
  client: Client | null;
  sellerName: string;
  quoteIdStr: string;
  companyConfig: CompanyConfig | null;
  products: Product[];
}

// Bank account type expected in cuentas_bancarias JSON
interface BankAccount {
  banco: string;
  tipo?: string;
  cuentas: { moneda: string; numero: string }[];
}

export const QuotePDFDocument = ({ quoteData, totals, lineItems, client, sellerName, quoteIdStr, companyConfig, products }: QuotePDFTemplateProps) => {
  const formatDate = (d: string) => {
    if (!d) return '';
    return new Intl.DateTimeFormat('es-PE', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(d));
  };

  const clientDoc = client?.numero_documento || '-';
  const clientName = client?.razon_social?.trim() || `${client?.nombres_contacto || ''} ${client?.apellidos_contacto || ''}`.trim() || '-';
  const validezDias = quoteData.fecha_emision && quoteData.fecha_validez
    ? Math.ceil((new Date(quoteData.fecha_validez).getTime() - new Date(quoteData.fecha_emision).getTime()) / 86400000)
    : 15;

  // Company data with fallbacks
  const companyName   = companyConfig?.razon_social || 'Mi Empresa';
  const companyRuc    = companyConfig?.ruc || '-';
  const companyAddr   = companyConfig?.direccion || '';
  const companyLogo   = companyConfig?.logo_url || null;
  // Initials for logo fallback (first letters of each word)
  const companyInitials = companyName.split(' ').slice(0, 2).map((w: string) => w[0]).join('');

  // Terms
  const termsText = companyConfig?.terminos_condiciones || '';

  // Bank accounts — stored as JSON array in cuentas_bancarias
  let bankAccounts: BankAccount[] = [];
  if (companyConfig?.cuentas_bancarias) {
    try {
      bankAccounts = JSON.parse(companyConfig.cuentas_bancarias);
    } catch {
      bankAccounts = [];
    }
  }

  return (
    <Document>
      <Page size="A4" style={S.page}>
        <View style={S.container}>

          {/* ── Header ── */}
          <View style={S.header} wrap={false}>
            <View style={S.companyBlock}>
              {companyLogo
                ? <Image src={companyLogo} style={S.logoImage} />
                : <Text style={S.logoText}>{companyInitials}</Text>
              }
              <Text style={S.companySubName}>{companyName}</Text>
              <Text style={S.companyName}>{companyName}</Text>
              {companyAddr ? (
                <View style={S.contactLine}><Text style={S.contactText}>{companyAddr}</Text></View>
              ) : null}
            </View>

            <View style={S.headerCenter}>
              <Text style={S.headerCenterText}>Cotización de productos y servicios</Text>
            </View>

            <View style={S.docBox}>
              <Text style={S.docRuc}>RUC: {companyRuc}</Text>
              <Text style={S.docTitle}>Cotización</Text>
              <Text style={S.docNumber}>{quoteIdStr}</Text>
            </View>
          </View>

          {/* ── Detail Cards ── */}
          <View style={S.cardsRow} wrap={false}>
            {/* Client */}
            <View style={S.card}>
              <View style={S.cardHeader}><Text style={S.cardTitle}>Datos del cliente</Text></View>
              <View style={S.gridRow}><Text style={S.gridLabel}>RUC/DNI:</Text><Text style={S.gridValue}>{clientDoc}</Text></View>
              <View style={S.gridRow}><Text style={S.gridLabel}>Denominación:</Text><Text style={S.gridValue}>{clientName}</Text></View>
              <View style={S.gridRow}><Text style={S.gridLabel}>Representante:</Text><Text style={S.gridValue}>{client?.nombres_contacto ? `${client.nombres_contacto} ${client.apellidos_contacto || ''}`.trim() : '-'}</Text></View>
              <View style={S.gridRow}><Text style={S.gridLabel}>Dirección:</Text><Text style={S.gridValue}>{client?.direccion || '-'}</Text></View>
              <View style={S.gridRow}><Text style={S.gridLabel}>Teléfono:</Text><Text style={S.gridValue}>{client?.telefono || '-'}</Text></View>
            </View>

            {/* Quote details */}
            <View style={S.card}>
              <View style={S.cardHeader}><Text style={S.cardTitle}>Datos de cotización</Text></View>
              <View style={S.gridRow}><Text style={S.gridLabel}>Fecha emisión:</Text><Text style={S.gridValue}>{formatDate(quoteData.fecha_emision)}</Text></View>
              <View style={S.gridRow}><Text style={S.gridLabel}>Fecha validez:</Text><Text style={S.gridValue}>{formatDate(quoteData.fecha_validez)}</Text></View>
              <View style={S.gridRow}><Text style={S.gridLabel}>Moneda:</Text><Text style={S.gridValue}>Soles (PEN)</Text></View>
              <View style={S.gridRow}><Text style={S.gridLabel}>Vendedor:</Text><Text style={S.gridValue}>{sellerName || 'No asignado'}</Text></View>
              <View style={S.gridRow}><Text style={S.gridLabel}>Validez:</Text><Text style={S.gridValue}>{validezDias} días</Text></View>
            </View>
          </View>

          {/* ── Table ── */}
          <View style={S.tableWrapper}>
            <View style={S.tableHead} wrap={false}>
              <Text style={[S.thCell, S.colQty]}>Cantidad</Text>
              <Text style={[S.thCell, S.colDesc]}>Nombre del Producto</Text>
              <Text style={[S.thCell, S.colCode]}>Código</Text>
              <Text style={[S.thCell, S.colPrice]}>Precio U.</Text>
              <Text style={[S.thCell, S.colSub]}>Subtotal</Text>
            </View>
            {lineItems.map((item, idx) => (
              <View key={idx} style={[S.tableRow, idx === lineItems.length - 1 ? { borderBottomWidth: 0 } : {}]} wrap={false}>
                <Text style={[S.tdCell, S.colQty]}>{item.cantidad}</Text>
                <Text style={[S.tdCell, S.colDesc]}>{item.nombre_producto_historico}</Text>
                <Text style={[S.tdCell, S.colCode]}>
                  {item.producto_id ? products.find(p => p.id === item.producto_id)?.sku || '-' : '-'}
                </Text>
                <Text style={[S.tdCell, S.colPrice]}>{Number(item.precio_unitario).toFixed(2)}</Text>
                <Text style={[S.tdCell, S.colSub]}>{Number(item.subtotal_linea).toFixed(2)}</Text>
              </View>
            ))}
          </View>

          {/* ── Totals ── */}
          <View style={S.totalsRow} wrap={false}>
            <Text style={S.totalsTitle}>Totales:</Text>
            <View style={S.totalsBox}>
              <View style={S.totalsLine}>
                <Text style={S.tLabel}>SUBTOTAL (Base):</Text>
                <Text style={S.tValue}>{formatCurrency(totals.subtotal)}</Text>
              </View>
              {quoteData.aplica_igv && (
                <View style={S.totalsLine}>
                  <Text style={S.tLabel}>IGV (18%):</Text>
                  <Text style={S.tValue}>{formatCurrency(totals.igv_monto)}</Text>
                </View>
              )}
              {quoteData.descuento_global_monto > 0 && (
                <View style={S.totalsLine}>
                  <Text style={S.tLabel}>DESCUENTO GLOBAL:</Text>
                  <Text style={S.tDiscount}>- {formatCurrency(quoteData.descuento_global_monto)}</Text>
                </View>
              )}
              <View style={S.tDivider} />
              <View style={S.totalsLine}>
                <Text style={S.tFinalLabel}>TOTAL A PAGAR:</Text>
                <Text style={S.tFinalValue}>{formatCurrency(totals.total_final)}</Text>
              </View>
            </View>
          </View>

          {/* ── Terms & Observations ── */}
          <View style={S.infoRow} wrap={false}>
            <View style={S.infoCard}>
              <Text style={S.infoTitle}>Términos y condiciones</Text>
              <Text style={S.infoText}>{quoteData.aplica_igv ? 'Precio SÍ incluye IGV (18%)' : 'Precio NO incluye IGV'}</Text>
              {termsText ? <Text style={S.infoText}>{termsText}</Text> : null}
            </View>
            <View style={S.infoCard}>
              <Text style={S.infoTitle}>Observaciones</Text>
              <Text style={S.infoText}>1. Si su compra se realiza con transferencia interbancaria o cheque, deberá esperar que el dinero ingrese a nuestra cuenta para validar su pedido.</Text>
              <Text style={S.infoText}>2. El precio es ofertado según la cantidad solicitada.</Text>
              {quoteData.observaciones_pdf ? <Text style={S.infoText}>3. {quoteData.observaciones_pdf}</Text> : null}
            </View>
          </View>

          {/* ── Bank Accounts (dynamic) ── */}
          {bankAccounts.length > 0 && (
            <View style={S.banksWrapper} wrap={false}>
              <View style={S.banksHeader}>
                <Text style={S.banksHeaderText}>Números de cuenta: {companyName}</Text>
              </View>
              <View style={S.banksBody}>
                {bankAccounts.map((bank, bi) => (
                  <View key={bi} style={[S.bankCol, bi < bankAccounts.length - 1 ? S.bankColBorder : {}]}>
                    <Text style={S.bankName}>{bank.banco}</Text>
                    {bank.tipo ? <Text style={S.bankSub}>{bank.tipo}</Text> : null}
                    {bank.cuentas?.map((cuenta, ci) => (
                      <View key={ci} style={S.accountBlock}>
                        <Text style={S.accountLabel}>{cuenta.moneda}</Text>
                        <View style={S.accountValueBox}>
                          <Text style={S.accountValue}>{cuenta.numero}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                ))}
              </View>
            </View>
          )}

        </View>
      </Page>
    </Document>
  );
};
