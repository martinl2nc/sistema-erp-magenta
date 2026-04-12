import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const tipo = searchParams.get('tipo');
  const numero = searchParams.get('numero');

  if (!tipo || !numero) {
    return NextResponse.json(
      { success: false, message: 'Faltan parámetros tipo o numero' },
      { status: 400 }
    );
  }

  if (tipo !== 'DNI' && tipo !== 'RUC') {
    return NextResponse.json(
      { success: false, message: 'El tipo de documento debe ser DNI o RUC' },
      { status: 400 }
    );
  }

  const baseUrl = process.env.APISPERU_BASE_URL;
  const token = process.env.APISPERU_TOKEN;

  if (!baseUrl || !token) {
    console.error('Error: Faltan variables de entorno APISPERU_BASE_URL o APISPERU_TOKEN');
    return NextResponse.json(
      { success: false, message: 'Error de configuración del servidor' },
      { status: 500 }
    );
  }

  try {
    const endpoint = tipo === 'DNI' ? `/dni/${numero}` : `/ruc/${numero}`;
    const url = `${baseUrl}${endpoint}?token=${token}`;

    const response = await fetch(url, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
      cache: 'no-store', // Evitar caché agresivo para siempre tener el estado real
    });

    const data = await response.json();

    // La API retorna objects como { success: false, message: "..." } cuando algo sale mal
    // o el número no existe, aunque el status code pueda ser 200 OK.
    if (!response.ok || data.success === false) {
      return NextResponse.json(
        { success: false, message: data.message || 'Documento no encontrado o error en SUNAT/RENIEC.' },
        { status: response.status === 200 ? 404 : response.status }
      );
    }

    return NextResponse.json({ success: true, data });
  } catch (error: any) {
    console.error('Error fetching sunat data:', error);
    return NextResponse.json(
      { success: false, message: 'Error interno al comunicarse con el proveedor de consultas.' },
      { status: 500 }
    );
  }
}
