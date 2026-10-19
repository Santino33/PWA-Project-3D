/** Estado local del usuario, independiente de los metadatos públicos del catálogo. */
export interface EstadoModelo {
  modeloId: string;
  favorito: 0 | 1;
  ultimaVista?: number;
}
