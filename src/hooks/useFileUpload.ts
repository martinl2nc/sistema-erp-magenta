/**
 * Custom hook para manejo de carga de archivos con drag & drop
 * Centraliza la lógica de validación, eventos de arrastre y estado del archivo
 */

import { useState, useRef, useCallback } from 'react';
import { toast } from 'sonner';
import { FILE_UPLOAD } from '@/constants';

export interface UseFileUploadOptions {
  /** Tipos MIME permitidos (opcional, usa defaults de FILE_UPLOAD) */
  allowedTypes?: readonly string[];
  
  /** Tamaño máximo en bytes (opcional, usa default de FILE_UPLOAD) */
  maxSizeBytes?: number;
  
  /** Mensaje personalizado para tipo inválido */
  errorInvalidType?: string;
  
  /** Mensaje personalizado para tamaño excedido */
  errorSizeExceeded?: string;
  
  /** Callback ejecutado cuando se selecciona un archivo válido */
  onFileSelected?: (file: File) => void;
  
  /** Callback ejecutado cuando la validación falla */
  onValidationError?: (error: string) => void;
}

export interface UseFileUploadReturn {
  /** Archivo actualmente seleccionado */
  file: File | null;
  
  /** Estado de arrastre (drag over) */
  isDragging: boolean;
  
  /** Referencia al input[type="file"] oculto */
  fileInputRef: React.RefObject<HTMLInputElement | null>;
  
  /** Handler para onChange del input */
  handleFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  
  /** Handler para onDrop */
  handleDrop: (e: React.DragEvent) => void;
  
  /** Handler para onDragOver */
  handleDragOver: (e: React.DragEvent) => void;
  
  /** Handler para onDragLeave */
  handleDragLeave: () => void;
  
  /** Limpia el archivo seleccionado */
  clearFile: () => void;
  
  /** Abre el diálogo de selección de archivos */
  openFileDialog: () => void;
  
  /** Valida y establece un archivo manualmente */
  setValidatedFile: (file: File) => boolean;
}

/**
 * Hook personalizado para manejar la carga de archivos con validación y drag & drop
 * 
 * @example
 * ```tsx
 * const { file, isDragging, fileInputRef, handleFileChange, handleDrop, handleDragOver, handleDragLeave } = useFileUpload({
 *   onFileSelected: (file) => console.log('Archivo seleccionado:', file.name)
 * });
 * 
 * return (
 *   <div
 *     onDragOver={handleDragOver}
 *     onDragLeave={handleDragLeave}
 *     onDrop={handleDrop}
 *     className={isDragging ? 'border-blue-500' : 'border-gray-500'}
 *   >
 *     <input
 *       ref={fileInputRef}
 *       type="file"
 *       hidden
 *       onChange={handleFileChange}
 *     />
 *     {file ? file.name : 'Arrastra un archivo aquí'}
 *   </div>
 * );
 * ```
 */
export function useFileUpload(options: UseFileUploadOptions = {}): UseFileUploadReturn {
  const {
    allowedTypes = FILE_UPLOAD.ALLOWED_TYPES_ARRAY,
    maxSizeBytes = FILE_UPLOAD.MAX_SIZE_BYTES,
    errorInvalidType = FILE_UPLOAD.ERROR_INVALID_TYPE,
    errorSizeExceeded = FILE_UPLOAD.ERROR_SIZE_EXCEEDED,
    onFileSelected,
    onValidationError,
  } = options;

  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /**
   * Valida un archivo contra las reglas establecidas
   * @returns true si el archivo es válido, false si no
   */
  const validateFile = useCallback((f: File): boolean => {
    // Validar tipo
    if (!allowedTypes.includes(f.type)) {
      const error = errorInvalidType;
      toast.error(error);
      onValidationError?.(error);
      return false;
    }
    
    // Validar tamaño
    if (f.size > maxSizeBytes) {
      const error = errorSizeExceeded;
      toast.error(error);
      onValidationError?.(error);
      return false;
    }

    return true;
  }, [allowedTypes, maxSizeBytes, errorInvalidType, errorSizeExceeded, onValidationError]);

  /**
   * Valida y establece un archivo
   */
  const setValidatedFile = useCallback((f: File): boolean => {
    if (!validateFile(f)) {
      return false;
    }

    setFile(f);
    onFileSelected?.(f);
    return true;
  }, [validateFile, onFileSelected]);

  /**
   * Handler para el evento onChange del input file
   */
  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      setValidatedFile(selectedFile);
    }
  }, [setValidatedFile]);

  /**
   * Handler para el evento onDrop
   */
  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      setValidatedFile(droppedFile);
    }
  }, [setValidatedFile]);

  /**
   * Handler para el evento onDragOver
   */
  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  /**
   * Handler para el evento onDragLeave
   */
  const handleDragLeave = useCallback(() => {
    setIsDragging(false);
  }, []);

  /**
   * Limpia el archivo seleccionado
   */
  const clearFile = useCallback(() => {
    setFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  /**
   * Abre el diálogo nativo de selección de archivos
   */
  const openFileDialog = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  return {
    file,
    isDragging,
    fileInputRef,
    handleFileChange,
    handleDrop,
    handleDragOver,
    handleDragLeave,
    clearFile,
    openFileDialog,
    setValidatedFile,
  };
}
