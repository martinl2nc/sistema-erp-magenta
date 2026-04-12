import { createClient } from '@supabase/supabase-js';

// No es necesario dotenv, usaremos node --env-file=.env.local

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !serviceRoleKey) {
  console.error('Error: NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SERVICE_ROLE_KEY no están configuradas.');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, serviceRoleKey);

async function cleanup() {
  console.log('--- Iniciando limpieza de comprobantes de prueba (F001, B001) ---');

  // 1. Obtener todos los comprobantes de las series indicadas y sus notas de crédito
  const { data: comprobantes, error: fetchErr } = await supabase
    .from('comprobantes')
    .select('id, serie, correlativo, pedido_id, enlace_pdf, enlace_xml, enlace_cdr')
    .or('serie.eq.F001,serie.eq.B001,tipo_doc_codigo.eq.07');

  if (fetchErr) {
    console.error('Error al obtener comprobantes:', fetchErr.message);
    return;
  }

  const targetComprobantes = (comprobantes || []).filter((c: any) => c.serie === 'F001' || c.serie === 'B001');
  const targetIds = targetComprobantes.map((c: any) => c.id);
  
  const notes = (comprobantes || []).filter((c: any) => c.serie.startsWith('NC') || targetIds.includes(c.id)); 
  const allIdsToDelete = Array.from(new Set([...targetIds, ...notes.map((n: any) => n.id)]));
  const uniquePedidoIds = Array.from(new Set(targetComprobantes.map((c: any) => c.pedido_id).filter(Boolean)));

  console.log(`Encontrados ${targetComprobantes.length} facturas/boletas y ${allIdsToDelete.length - targetIds.length} notas relacionadas.`);
  console.log(`Se resetearán ${uniquePedidoIds.length} pedidos.`);

  if (allIdsToDelete.length === 0) {
    console.log('No se encontraron comprobantes para eliminar.');
    return;
  }

  // 2. Resetear pedidos a 'pendiente_facturacion'
  if (uniquePedidoIds.length > 0) {
    console.log('Actualizando estado de pedidos...');
    const { error: updErr } = await supabase
      .from('pedidos')
      .update({ estado: 'pendiente_facturacion' })
      .in('id', uniquePedidoIds);
    if (updErr) console.error('Error al actualizar pedidos:', updErr.message);
    else console.log('Pedidos reseteados correctamente.');
  }

  // 3. Eliminar archivos de Storage (facturas_emitidas)
  console.log('Eliminando archivos del Storage...');
  for (const comp of targetComprobantes) {
    const extractPath = (url: string | null) => {
      if (!url) return null;
      const parts = url.split('/facturas_emitidas/');
      if (parts.length > 1) return parts[1].split('?')[0];
      return null;
    };

    const pdfPath = extractPath(comp.enlace_pdf);
    const xmlPath = extractPath(comp.enlace_xml);
    const cdrPath = extractPath(comp.enlace_cdr);

    const paths = [pdfPath, xmlPath, cdrPath].filter(Boolean) as string[];
    if (paths.length > 0) {
      const { error: storageErr } = await supabase.storage.from('facturas_emitidas').remove(paths);
      if (storageErr) console.error(`Error eliminando archivos de ${comp.serie}-${comp.correlativo}:`, storageErr.message);
    }
  }

  // 4. Eliminar detalles y comprobantes
  console.log('Eliminando registros de base de datos...');
  
  const { error: detErr } = await supabase
    .from('comprobantes_detalles')
    .delete()
    .in('comprobante_id', allIdsToDelete);
  
  if (detErr) console.error('Error al eliminar detalles:', detErr.message);

  const { error: compDelErr } = await supabase
    .from('comprobantes')
    .delete()
    .in('id', allIdsToDelete);

  if (compDelErr) console.error('Error al eliminar comprobantes:', compDelErr.message);
  else console.log('Comprobantes eliminados de la base de datos.');

  console.log('--- Limpieza finalizada ---');
}

cleanup();
