class GestorRegistro {
    constructor() {
        this.entradas = [];
        this.inicializarElementos();
        this.configurarEventos();
    }

    inicializarElementos() {
        this.elementos = {
            contenidoRegistro: document.getElementById('contenidoRegistro'),
            limpiarRegistro: document.getElementById('limpiarRegistro'),
            exportarRegistro: document.getElementById('exportarRegistro'),
            exportarRango: document.getElementById('exportarRango'),
            filtroDesde: document.getElementById('filtroDesde'),
            filtroHasta: document.getElementById('filtroHasta')
        };
    }

    configurarEventos() {
        this.elementos.limpiarRegistro.addEventListener('click', () => this.limpiarRegistro());
        this.elementos.exportarRegistro.addEventListener('click', () => this.exportarTodo());
        this.elementos.exportarRango.addEventListener('click', () => this.exportarPorRango());
        
        this.elementos.filtroDesde.addEventListener('change', () => this.validarFiltros());
        this.elementos.filtroHasta.addEventListener('change', () => this.validarFiltros());
    }

    agregarEntrada(mensaje, nivel) {
        const ahora = new Date();
        const tiempo = this.formatearTiempo(ahora);
        const entrada = {
            timestamp: ahora,
            tiempo: tiempo,
            nivel: nivel,
            mensaje: mensaje
        };

        this.entradas.push(entrada);
        this.mostrarEntrada(entrada);
    }

    formatearTiempo(fecha) {
        return `[${fecha.getHours().toString().padStart(2, '0')}:${fecha.getMinutes().toString().padStart(2, '0')}:${fecha.getSeconds().toString().padStart(2, '0')}]`;
    }

    mostrarEntrada(entrada) {
        const elemento = document.createElement('div');
        elemento.className = 'registro__entrada';
        elemento.innerHTML = `
            <span class="registro__tiempo">${entrada.tiempo}</span>
            <span class="registro__nivel registro__nivel--${entrada.nivel}">${entrada.nivel.toUpperCase()}</span>
            <span class="registro__mensaje">${entrada.mensaje}</span>
        `;
        
        this.elementos.contenidoRegistro.appendChild(elemento);
        this.elementos.contenidoRegistro.scrollTop = this.elementos.contenidoRegistro.scrollHeight;
    }

    obtenerEntradasPorRango(desde, hasta) {
        return this.entradas.filter(entrada => {
            const horaEntrada = entrada.timestamp.getHours() * 3600 + 
                              entrada.timestamp.getMinutes() * 60 + 
                              entrada.timestamp.getSeconds();
            return horaEntrada >= desde && horaEntrada <= hasta;
        });
    }

    parsearTiempo(tiempoString) {
        const [horas, minutos, segundos] = tiempoString.split(':').map(Number);
        return horas * 3600 + minutos * 60 + segundos;
    }

    validarFiltros() {
        const desde = this.elementos.filtroDesde.value;
        const hasta = this.elementos.filtroHasta.value;
        
        if (desde && hasta) {
            const tiempoDesde = this.parsearTiempo(desde);
            const tiempoHasta = this.parsearTiempo(hasta);
            
            this.elementos.exportarRango.disabled = tiempoDesde > tiempoHasta;
        } else {
            this.elementos.exportarRango.disabled = !desde || !hasta;
        }
    }

    exportarPorRango() {
        const desde = this.elementos.filtroDesde.value;
        const hasta = this.elementos.filtroHasta.value;
        
        if (!desde || !hasta) {
            this.mostrarError('Seleccione ambos rangos de tiempo');
            return;
        }

        const tiempoDesde = this.parsearTiempo(desde);
        const tiempoHasta = this.parsearTiempo(hasta);
        
        if (tiempoDesde > tiempoHasta) {
            this.mostrarError('El tiempo inicial no puede ser mayor al final');
            return;
        }

        const entradasFiltradas = this.obtenerEntradasPorRango(tiempoDesde, tiempoHasta);
        
        if (entradasFiltradas.length === 0) {
            this.mostrarError('No hay entradas en el rango seleccionado');
            return;
        }

        this.generarArchivo(entradasFiltradas, `log-rango-${desde}-a-${hasta}.txt`);
        this.mostrarExito(`Exportadas ${entradasFiltradas.length} entradas`);
    }

    exportarTodo() {
        if (this.entradas.length === 0) {
            this.mostrarError('No hay entradas para exportar');
            return;
        }

        this.generarArchivo(this.entradas, 'log-completo.txt');
        this.mostrarExito(`Exportadas ${this.entradas.length} entradas`);
    }

    generarArchivo(entradas, nombreArchivo) {
        const contenido = entradas.map(entrada => 
            `${entrada.tiempo} [${entrada.nivel.toUpperCase()}] ${entrada.mensaje}`
        ).join('\n');

        const blob = new Blob([contenido], { type: 'text/plain;charset=utf-8' });
        const url = URL.createObjectURL(blob);
        const enlace = document.createElement('a');
        enlace.href = url;
        enlace.download = nombreArchivo;
        enlace.click();
        URL.revokeObjectURL(url);
    }

    limpiarRegistro() {
        this.entradas = [];
        this.elementos.contenidoRegistro.innerHTML = '';
        this.agregarEntrada('Registro limpiado', 'info');
    }

    mostrarError(mensaje) {
        this.agregarEntrada(`Error al exportar: ${mensaje}`, 'error');
    }

    mostrarExito(mensaje) {
        this.agregarEntrada(mensaje, 'exito');
    }

    obtenerEstadisticas() {
        const total = this.entradas.length;
        const porNivel = {
            info: this.entradas.filter(e => e.nivel === 'info').length,
            exito: this.entradas.filter(e => e.nivel === 'exito').length,
            advertencia: this.entradas.filter(e => e.nivel === 'advertencia').length,
            error: this.entradas.filter(e => e.nivel === 'error').length
        };

        return {
            total,
            porNivel,
            primeraEntrada: this.entradas[0]?.timestamp || null,
            ultimaEntrada: this.entradas[this.entradas.length - 1]?.timestamp || null
        };
    }
}