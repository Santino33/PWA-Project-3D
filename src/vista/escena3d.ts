/* ============================================================================
   CAPA DE VISTA — La escena de Three.js.

   Solo sabe de cámaras, luces y objetos 3D. No sabe qué es un patrón: recibe
   un THREE.Group ya construido y lo muestra.

   Ojo a setAnimationLoop: es el bucle de dibujo que exige WebXR, así que el
   mismo código sirve cuando en las Sesiones 38-39 llegue la realidad aumentada
   (con requestAnimationFrame habría que reescribirlo).
   ========================================================================== */

import * as THREE from "three";

export class Escena3D {
  private renderizador: THREE.WebGLRenderer;
  private escena: THREE.Scene;
  private camara: THREE.PerspectiveCamera;
  private objetoActual: THREE.Group | null = null;
  private observador: ResizeObserver;
  private interseccion: IntersectionObserver | null = null;
  private contextoDisponible = true;
  private animando = false;
  private enPantalla = true;
  private readonly reducirMovimiento = window.matchMedia("(prefers-reduced-motion: reduce)");

  get disponible(): boolean {
    return this.contextoDisponible;
  }

  // Estado del arrastre con el mouse/dedo
  private arrastrando = false;
  private ultimoX = 0;
  private ultimoY = 0;

  constructor(lienzo: HTMLCanvasElement, notificarEstado: (mensaje: string) => void) {
    this.renderizador = new THREE.WebGLRenderer({
      canvas: lienzo,
      antialias: true,
      alpha: true,
    });
    this.renderizador.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.escena = new THREE.Scene();

    this.camara = new THREE.PerspectiveCamera(45, 1, 0.1, 100);
    this.camara.position.set(0, 1.2, 9);
    this.camara.lookAt(0, 0, 0);

    this.escena.add(new THREE.AmbientLight(0xffffff, 1.1));

    const principal = new THREE.DirectionalLight(0xffffff, 2.2);
    principal.position.set(4, 6, 6);
    this.escena.add(principal);

    const relleno = new THREE.DirectionalLight(0x60a5fa, 1.0);
    relleno.position.set(-5, -2, 3);
    this.escena.add(relleno);

    this.observador = new ResizeObserver(() => this.ajustarTamano());
    this.observador.observe(lienzo.parentElement ?? lienzo);
    if ("IntersectionObserver" in window) {
      this.interseccion = new IntersectionObserver(([entrada]) => {
        this.enPantalla = entrada.isIntersecting;
        this.sincronizarAnimacion();
      });
      this.interseccion.observe(lienzo);
    }

    this.conectarArrastre(lienzo);
    lienzo.addEventListener("keydown", (evento) => {
      if (!this.objetoActual || !["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown"].includes(evento.key)) return;
      evento.preventDefault();
      if (evento.key === "ArrowLeft") this.objetoActual.rotation.y -= 0.15;
      if (evento.key === "ArrowRight") this.objetoActual.rotation.y += 0.15;
      if (evento.key === "ArrowUp") this.objetoActual.rotation.x -= 0.15;
      if (evento.key === "ArrowDown") this.objetoActual.rotation.x += 0.15;
      if (this.reducirMovimiento.matches) this.dibujar();
    });
    document.addEventListener("visibilitychange", () => {
      this.sincronizarAnimacion();
    });
    this.reducirMovimiento.addEventListener("change", () => {
      this.sincronizarAnimacion();
      if (this.reducirMovimiento.matches) this.dibujar();
    });
    lienzo.addEventListener("webglcontextlost", (evento) => {
      evento.preventDefault();
      this.contextoDisponible = false;
      notificarEstado("Se perdió el contexto gráfico. Esperando su recuperación…");
    });
    lienzo.addEventListener("webglcontextrestored", () => {
      this.contextoDisponible = true;
      notificarEstado("");
      if (this.reducirMovimiento.matches) this.dibujar();
    });
    this.ajustarTamano();
  }

  /** Reemplaza el objeto en pantalla, liberando la memoria del anterior. */
  mostrar(grupo: THREE.Group): void {
    if (this.objetoActual) {
      this.escena.remove(this.objetoActual);
      this.liberar(this.objetoActual);
    }

    this.objetoActual = grupo;
    this.escena.add(grupo);
    if (this.reducirMovimiento.matches && this.contextoDisponible) this.dibujar();
  }

  iniciar(): void {
    this.animando = true;
    this.sincronizarAnimacion();
  }

  private sincronizarAnimacion(): void {
    this.renderizador.setAnimationLoop(this.animando && this.enPantalla && !document.hidden &&
      !this.reducirMovimiento.matches ? this.dibujar : null);
  }

  private dibujar = (): void => {
    // Giro lento continuo, salvo mientras el usuario arrastra.
    if (this.objetoActual && !this.arrastrando && !this.reducirMovimiento.matches) {
      this.objetoActual.rotation.y += 0.004;
    }
    if (this.contextoDisponible) this.renderizador.render(this.escena, this.camara);
  };

  detener(): void {
    this.animando = false;
    this.renderizador.setAnimationLoop(null);
    this.observador.disconnect();
    this.interseccion?.disconnect();
    if (this.objetoActual) this.liberar(this.objetoActual);
    this.renderizador.dispose();
  }

  private ajustarTamano(): void {
    const lienzo = this.renderizador.domElement;
    const contenedor = lienzo.parentElement;
    const ancho = contenedor?.clientWidth ?? lienzo.clientWidth;
    const alto = contenedor?.clientHeight ?? lienzo.clientHeight;
    if (ancho === 0 || alto === 0) return;

    this.renderizador.setSize(ancho, alto, false);
    this.camara.aspect = ancho / alto;
    this.camara.updateProjectionMatrix();
    if (this.objetoActual && this.reducirMovimiento.matches) this.dibujar();
  }

  /** Arrastrar con el mouse o el dedo para girar el objeto. */
  private conectarArrastre(lienzo: HTMLCanvasElement): void {
    lienzo.addEventListener("pointerdown", (evento) => {
      this.arrastrando = true;
      this.ultimoX = evento.clientX;
      this.ultimoY = evento.clientY;
      lienzo.setPointerCapture(evento.pointerId);
    });

    lienzo.addEventListener("pointermove", (evento) => {
      if (!this.arrastrando || !this.objetoActual) return;

      this.objetoActual.rotation.y += (evento.clientX - this.ultimoX) * 0.01;
      this.objetoActual.rotation.x += (evento.clientY - this.ultimoY) * 0.01;
      if (this.reducirMovimiento.matches) this.dibujar();

      this.ultimoX = evento.clientX;
      this.ultimoY = evento.clientY;
    });

    const soltar = (evento: PointerEvent) => {
      this.arrastrando = false;
      if (lienzo.hasPointerCapture(evento.pointerId)) {
        lienzo.releasePointerCapture(evento.pointerId);
      }
    };
    lienzo.addEventListener("pointerup", soltar);
    lienzo.addEventListener("pointercancel", soltar);
  }

  /**
   * Three.js no libera solo las geometrías ni los materiales: hay que llamar
   * dispose() a mano o la memoria de la GPU se va llenando cada vez que se
   * cambia de patrón.
   */
  private liberar(objeto: THREE.Object3D): void {
    objeto.traverse((hijo) => {
      const malla = hijo as Partial<THREE.Mesh>;
      malla.geometry?.dispose();

      const material = malla.material;
      if (Array.isArray(material)) material.forEach((m) => m.dispose());
      else material?.dispose();
    });
  }
}
