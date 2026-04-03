const { createClient } = require('@supabase/supabase-js');

const supabaseUrl = 'https://enccvegwoycrkedzabuz.supabase.co';
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVuY2N2ZWd3b3ljcmtlZHphYnV6Iiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3MzM2NTg1NywiZXhwIjoyMDg4OTQxODU3fQ.w4MEbho_0Yih340_mTxOFeMHsWtJSlMNjsWIiHtrGhQ';

const supabase = createClient(supabaseUrl, supabaseKey);

async function fetchRPC() {
  const { data, error } = await supabase.rpc('execute_sql', {
    sql: "SELECT prosrc FROM pg_proc WHERE proname = 'emitir_comprobante'"
  });

  if (error) {
    console.error('Error:', error.message);
  } else if (data && data.length > 0) {
    console.log(data[0].prosrc);
  } else {
    console.log('RPC not found');
  }
}

fetchRPC();
