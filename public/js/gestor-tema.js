class GestorTema {
    constructor() {
        this.temaActual = localStorage.getItem('tema') || 'claro';
        this.botonTema = document.getElementById('botonTema');
        this.iconoTema = this.botonTema?.querySelector('.boton-tema__icono');
        this.textoTema = this.botonTema?.querySelector('.boton-tema__texto');

        this.inicializar();
    }

    inicializar() {
        this.aplicarTema(this.temaActual);
        this.configurarEventos();
    }

    configurarEventos() {
        if (this.botonTema) {
            this.botonTema.addEventListener('click', () => this.alternarTema());
        }

        if (window.matchMedia) {
            const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
            mediaQuery.addEventListener('change', (e) => {
                if (!localStorage.getItem('tema')) {
                    this.aplicarTema(e.matches ? 'oscuro' : 'claro');
                }
            });
        }
    }

    alternarTema() {
        const nuevoTema = this.temaActual === 'claro' ? 'oscuro' : 'claro';
        this.aplicarTema(nuevoTema);
        this.guardarPreferencia(nuevoTema);
    }

    aplicarTema(tema) {
        this.temaActual = tema;
        document.body.setAttribute('data-tema', tema);
        this.actualizarInterfaz();
        this.dispatchEventoTemaCambiado();
    }

    actualizarInterfaz() {
        if (this.iconoTema && this.textoTema) {
            if (this.temaActual === 'oscuro') {
                this.iconoTema.textContent = '☀️';
                this.textoTema.textContent = 'Modo Claro';
            } else {
                this.iconoTema.textContent = '🌙';
                this.textoTema.textContent = 'Modo Oscuro';
            }
        }
    }

    guardarPreferencia(tema) {
        localStorage.setItem('tema', tema);
    }

    dispatchEventoTemaCambiado() {
        const evento = new CustomEvent('temaCambiado', {
            detail: { tema: this.temaActual }
        });
        document.dispatchEvent(evento);
    }

    obtenerTemaActual() {
        return this.temaActual;
    }

    suscribir(callback) {
        document.addEventListener('temaCambiado', (e) => callback(e.detail.tema));
    }

    usarPreferenciaSistema() {
        localStorage.removeItem('tema');
        const preferenciaSistema = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches
            ? 'oscuro'
            : 'claro';
        this.aplicarTema(preferenciaSistema);
    }
}