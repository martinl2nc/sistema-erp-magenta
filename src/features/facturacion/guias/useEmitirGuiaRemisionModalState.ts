'use client';

import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { useEmitirGuiaRemision, useMotivoTraslado } from '@/hooks/useGuiasRemision';
import { usePedidoComprobante } from '@/hooks/useFacturas';
import type { UbigeoRecord } from '@/services/ubigeo.service';
import type { GuiaRemisionLinea, EmitirGuiaRemisionResult } from '@/services/guiasRemision.service';
import type { CompanyConfig } from '@/services/companyConfig.service';
import type { Client } from '@/services/clients.service';
import type { PedidoLinea } from '@/services/pedidos.service';

interface Options {
  isOpen: boolean;
  onClose: () => void;
  empresa: CompanyConfig;
  cliente: Client;
  pedidoId?: string | null;
  pedidoLineas?: PedidoLinea[];
  comprobanteSerieNumero?: string | null;
  comprobanteTipoDoc?: string | null;
  onSuccess?: (result: EmitirGuiaRemisionResult) => void;
}

interface DireccionState {
  ubigueo: string;
  departamento: string;
  provincia: string;
  distrito: string;
  direccion: string;
}

export function useEmitirGuiaRemisionModalState({
  isOpen,
  onClose,
  empresa,
  cliente,
  pedidoId,
  pedidoLineas = [],
  comprobanteSerieNumero,
  comprobanteTipoDoc,
  onSuccess,
}: Options) {
  const { data: motivos = [] } = useMotivoTraslado();
  const emitirMutation = useEmitirGuiaRemision();

  const [step, setStep] = useState<1 | 2>(1);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [emitResult, setEmitResult] = useState<EmitirGuiaRemisionResult | null>(null);

  const today = new Date().toISOString().split('T')[0];

  const [fechaInicioTraslado, setFechaInicioTraslado] = useState(today);
  const [motivoCodigo, setMotivoCodigo] = useState('01');
  const [motivoDesc, setMotivoDesc] = useState('');
  const [modalidad, setModalidad] = useState<'01' | '02'>('02');
  const [pesoBruto, setPesoBruto] = useState('');
  const [numeroBultos, setNumeroBultos] = useState('');
  const [observacion, setObservacion] = useState('');

  const [partida, setPartida] = useState<DireccionState>({
    ubigueo: empresa.ubigueo ?? '',
    departamento: empresa.departamento ?? '',
    provincia: empresa.provincia ?? '',
    distrito: empresa.distrito ?? '',
    direccion: empresa.direccion ?? '',
  });

  const [llegada, setLlegada] = useState<DireccionState>({
    ubigueo: '',
    departamento: '',
    provincia: '',
    distrito: '',
    direccion: cliente.direccion ?? '',
  });

  const [transpNumDoc, setTranspNumDoc] = useState('');
  const [transpRazonSocial, setTranspRazonSocial] = useState('');
  const [transpPlaca, setTranspPlaca] = useState('');
  const [conductorDoc, setConductorDoc] = useState('');
  const [vehiculoPlaca, setVehiculoPlaca] = useState('');
  const [vehiculoConductorDoc, setVehiculoConductorDoc] = useState('');
  const [vehiculoConductorNombres, setVehiculoConductorNombres] = useState('');
  const [tipoDocRel, setTipoDocRel] = useState(comprobanteTipoDoc || '01');
  const [nroDocRel, setNroDocRel] = useState(comprobanteSerieNumero || '');
  const [conductorNombres, setConductorNombres] = useState('');
  const [lineas, setLineas] = useState<GuiaRemisionLinea[]>([]);

  const { data: comprobanteAsociado } = usePedidoComprobante(pedidoId || undefined);

  useEffect(() => {
    if (comprobanteAsociado) {
      setTipoDocRel(comprobanteAsociado.tipo_doc_codigo);
      setNroDocRel(comprobanteAsociado.serie_numero);
    }
  }, [comprobanteAsociado]);

  useEffect(() => {
    if (!isOpen) return;
    const nowToday = new Date().toISOString().split('T')[0];
    setStep(1);
    setErrorMsg(null);
    setEmitResult(null);
    setFechaInicioTraslado(nowToday);
    setMotivoCodigo('01');
    setMotivoDesc('');
    setModalidad('02');
    setPesoBruto('');
    setNumeroBultos('');
    setObservacion('');
    setPartida({
      ubigueo: empresa.ubigueo ?? '',
      departamento: empresa.departamento ?? '',
      provincia: empresa.provincia ?? '',
      distrito: empresa.distrito ?? '',
      direccion: empresa.direccion ?? '',
    });
    setLlegada({ ubigueo: '', departamento: '', provincia: '', distrito: '', direccion: cliente.direccion ?? '' });
    setTranspNumDoc('');
    setTranspRazonSocial('');
    setTranspPlaca('');
    setConductorDoc('');
    setVehiculoPlaca('');
    setVehiculoConductorDoc('');
    setVehiculoConductorNombres('');
    setTipoDocRel(comprobanteTipoDoc || '01');
    setNroDocRel(comprobanteSerieNumero || '');
    setConductorNombres('');
    setLineas(
      pedidoLineas.map((l, i) => ({
        pedido_linea_id: l.id,
        producto_id: l.producto_id,
        descripcion: l.nombre_producto_historico,
        unidad_codigo: 'NIU',
        cantidad: l.cantidad,
        codigo_producto: l.sku ?? null,
        _orden: i,
      })) as GuiaRemisionLinea[],
    );
  }, [isOpen, empresa, cliente, pedidoLineas, comprobanteTipoDoc, comprobanteSerieNumero]);

  const motivoActual = motivos.find(m => m.codigo === motivoCodigo);
  const requiereDescLibre = motivoActual?.requiere_descripcion_libre ?? false;

  const handlePartidaUbigeo = (_codigo: string, record: UbigeoRecord) => {
    setPartida(prev => ({
      ...prev,
      ubigueo: record.codigo,
      departamento: record.departamento,
      provincia: record.provincia,
      distrito: record.distrito,
    }));
  };

  const handleLlegadaUbigeo = (_codigo: string, record: UbigeoRecord) => {
    setLlegada(prev => ({
      ...prev,
      ubigueo: record.codigo,
      departamento: record.departamento,
      provincia: record.provincia,
      distrito: record.distrito,
    }));
  };

  const validateStep1 = (): string | null => {
    if (!fechaInicioTraslado) return 'La fecha de inicio de traslado es obligatoria.';
    if (!motivoCodigo) return 'El motivo de traslado es obligatorio.';
    if (requiereDescLibre && !motivoDesc.trim())
      return 'Describí el motivo de traslado (código 13 "Otros" requiere descripción).';
    if (!partida.ubigueo) return 'Seleccioná el ubigeo de la dirección de partida.';
    if (!partida.direccion.trim()) return 'Ingresá la dirección descriptiva de partida.';
    if (!llegada.ubigueo) return 'Seleccioná el ubigeo de la dirección de llegada.';
    if (!llegada.direccion.trim()) return 'Ingresá la dirección descriptiva de llegada.';
    if (!pesoBruto || isNaN(Number(pesoBruto)) || Number(pesoBruto) <= 0)
      return 'El peso bruto total es obligatorio (en KGM).';
    if (modalidad === '01') {
      if (!transpNumDoc.trim()) return 'El RUC del transportista es obligatorio.';
      if (!transpPlaca.trim()) return 'La placa del vehículo es obligatoria.';
      if (!conductorDoc.trim()) return 'El DNI del conductor es obligatorio.';
    }
    if (modalidad === '02') {
      if (!vehiculoPlaca.trim()) return 'La placa del vehículo propio es obligatoria.';
      if (!vehiculoConductorDoc.trim()) return 'El DNI del conductor es obligatorio.';
    }
    return null;
  };

  const handleNextStep = () => {
    const err = validateStep1();
    if (err) { setErrorMsg(err); return; }
    setErrorMsg(null);
    setStep(2);
  };

  const handleEmitir = () => {
    if (!lineas.length) { setErrorMsg('Debés agregar al menos un bien a trasladar.'); return; }
    for (const l of lineas) {
      if (!l.descripcion.trim()) { setErrorMsg('Todas las líneas deben tener descripción.'); return; }
      if (!l.cantidad || l.cantidad <= 0) { setErrorMsg('Todas las líneas deben tener cantidad > 0.'); return; }
    }
    setErrorMsg(null);

    const nowToday = new Date().toISOString().split('T')[0];
    const payload = {
      pedido_id: pedidoId ?? null,
      comprobante_id: null,
      cliente_id: cliente.id,
      destinatario_tipo_doc: cliente.tipo_documento === 'RUC' ? '6' : '1',
      destinatario_num_doc: cliente.numero_documento ?? '',
      destinatario_razon_social:
        cliente.razon_social || `${cliente.nombres_contacto} ${cliente.apellidos_contacto}`.trim(),
      dir_llegada_ubigueo: llegada.ubigueo,
      dir_llegada_departamento: llegada.departamento,
      dir_llegada_provincia: llegada.provincia,
      dir_llegada_distrito: llegada.distrito,
      dir_llegada_direccion: llegada.direccion,
      dir_partida_ubigueo: partida.ubigueo,
      dir_partida_departamento: partida.departamento,
      dir_partida_provincia: partida.provincia,
      dir_partida_distrito: partida.distrito,
      dir_partida_direccion: partida.direccion,
      motivo_traslado_codigo: motivoCodigo,
      motivo_traslado_desc: requiereDescLibre ? motivoDesc : null,
      modalidad_traslado: modalidad,
      fecha_emision: nowToday,
      fecha_inicio_traslado: fechaInicioTraslado,
      peso_bruto_total: Number(pesoBruto),
      unidad_peso: 'KGM',
      numero_bultos: numeroBultos ? Number(numeroBultos) : null,
      observacion: observacion || null,
      transportista_tipo_doc: modalidad === '01' ? '6' : null,
      transportista_num_doc: modalidad === '01' ? transpNumDoc : null,
      transportista_razon_social: modalidad === '01' ? transpRazonSocial || null : null,
      transportista_placa: modalidad === '01' ? transpPlaca : null,
      conductor_tipo_doc: modalidad === '01' ? '1' : null,
      conductor_num_doc: modalidad === '01' ? conductorDoc : null,
      conductor_nombres: modalidad === '01' ? conductorNombres : null,
      vehiculo_propio_placa: modalidad === '02' ? vehiculoPlaca : null,
      vehiculo_propio_conductor_doc: modalidad === '02' ? vehiculoConductorDoc : null,
      vehiculo_propio_conductor_nombres: modalidad === '02' ? vehiculoConductorNombres : null,
      nro_doc_relacionado: nroDocRel || null,
      tipo_doc_relacionado: tipoDocRel || null,
      lineas: lineas.map(l => ({
        pedido_linea_id: l.pedido_linea_id,
        producto_id: l.producto_id,
        descripcion: l.descripcion,
        unidad_codigo: l.unidad_codigo,
        cantidad: Number(l.cantidad),
        codigo_producto: l.codigo_producto,
      })),
    };

    emitirMutation.mutate(payload, {
      onSuccess: result => {
        setEmitResult(result);
        toast.success(`Guía ${result.serie_numero} emitida correctamente.`);
        onSuccess?.(result);
      },
      onError: err => {
        toast.error(err.message);
      },
    });
  };

  const addLinea = () => {
    setLineas(prev => [
      ...prev,
      { pedido_linea_id: null, producto_id: null, descripcion: '', unidad_codigo: 'NIU', cantidad: 1, codigo_producto: null },
    ]);
  };

  const removeLinea = (idx: number) => setLineas(prev => prev.filter((_, i) => i !== idx));

  const updateLinea = (idx: number, field: keyof GuiaRemisionLinea, value: string | number) => {
    setLineas(prev => prev.map((l, i) => (i === idx ? { ...l, [field]: value } : l)));
  };

  const handleBack = () => {
    if (step === 1) onClose();
    else setStep(1);
  };

  return {
    motivos,
    emitirMutation,
    step,
    errorMsg,
    emitResult,
    fechaInicioTraslado, setFechaInicioTraslado,
    motivoCodigo, setMotivoCodigo,
    motivoDesc, setMotivoDesc,
    modalidad, setModalidad,
    pesoBruto, setPesoBruto,
    numeroBultos, setNumeroBultos,
    observacion, setObservacion,
    partida, setPartida,
    llegada, setLlegada,
    transpNumDoc, setTranspNumDoc,
    transpRazonSocial, setTranspRazonSocial,
    transpPlaca, setTranspPlaca,
    conductorDoc, setConductorDoc,
    vehiculoPlaca, setVehiculoPlaca,
    vehiculoConductorDoc, setVehiculoConductorDoc,
    vehiculoConductorNombres, setVehiculoConductorNombres,
    tipoDocRel, setTipoDocRel,
    nroDocRel, setNroDocRel,
    conductorNombres, setConductorNombres,
    lineas,
    requiereDescLibre,
    handlePartidaUbigeo,
    handleLlegadaUbigeo,
    handleNextStep,
    handleEmitir,
    handleBack,
    addLinea,
    removeLinea,
    updateLinea,
  };
}
