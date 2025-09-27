class Simulador {
    constructor() {
        this.gestorMemoria = null;
        this.planificador = new Planificador();
        this.gestorRegistro = new GestorRegistro();
        this.intervalo = null;
        this.velocidad = 5;
        this.enEjecucion = false;
        this.generadorAutomatico = null;
        this.contadorProcesos = 0;
        this.inicializarElementos();
        this.configurarEventos();
    }

    inicializarElementos() {
        this.elementos = {
            memoriaTotal: document.getElementById('memoriaTotal'),
            algoritmoAsignacion: document.getElementById('algoritmoAsignacion'),
            velocidadSimulacion: document.getElementById('velocidadSimulacion'),
            valorVelocidad: document.getElementById('valorVelocidad'),
            modoGestion: document.getElementById('modoGestion'),
            iniciarSistema: document.getElementById('iniciarSistema'),
            pausarSistema: document.getElementById('pausarSistema'),
            reiniciarSistema: document.getElementById('reiniciarSistema'),
            tamanoProceso: document.getElementById('tamanoProceso'),
            duracionProceso: document.getElementById('duracionProceso'),
            prioridadProceso: document.getElementById('prioridadProceso'),
            agregarProceso: document.getElementById('agregarProceso'),
            generarAutomatico: document.getElementById('generarAutomatico'),
            frecuenciaAuto: document.getElementById('frecuenciaAuto'),
            memoriaTotalValor: document.getElementById('memoriaTotalValor'),
            memoriaLibreValor: document.getElementById('memoriaLibreValor'),
            memoriaUsadaValor: document.getElementById('memoriaUsadaValor'),
            fragmentacionValor: document.getElementById('fragmentacionValor'),
            mapaMemoria: document.getElementById('mapaMemoria'),
            cuerpoTablaProcesos: document.getElementById('cuerpoTablaProcesos'),
            tiempoEsperaPromedio: document.getElementById('tiempoEsperaPromedio'),
            usoMemoria: document.getElementById('usoMemoria'),
            procesosCompletados: document.getElementById('procesosCompletados'),
            tasaFragmentacion: document.getElementById('tasaFragmentacion'),
            contenidoRegistro: document.getElementById('contenidoRegistro'),
            limpiarRegistro: document.getElementById('limpiarRegistro'),
            exportarRegistro: document.getElementById('exportarRegistro'),
            exportarRango: document.getElementById('exportarRango'),
            filtroDesde: document.getElementById('filtroDesde'),
            filtroHasta: document.getElementById('filtroHasta')
        };
    }

    configurarEventos() {
        this.elementos.iniciarSistema.addEventListener('click', () => this.iniciarSimulacion());
        this.elementos.pausarSistema.addEventListener('click', () => this.pausarSimulacion());
        this.elementos.reiniciarSistema.addEventListener('click', () => this.reiniciarSimulacion());
        this.elementos.agregarProceso.addEventListener('click', () => this.agregarProcesoManual());
        this.elementos.generarAutomatico.addEventListener('click', () => this.alternarGeneracionAutomatica());
        this.elementos.limpiarRegistro.addEventListener('click', () => this.limpiarRegistro());
        this.elementos.exportarRegistro.addEventListener('click', () => this.exportarRegistro());
        this.elementos.exportarRango.addEventListener('click', () => this.exportarRegistroPorRango());

        this.elementos.velocidadSimulacion.addEventListener('input', (e) => {
            this.velocidad = parseInt(e.target.value);
            this.elementos.valorVelocidad.textContent = this.velocidad;
            if (this.enEjecucion) {
                this.ajustarVelocidad();
            }
        });
    }

    iniciarSimulacion() {
        const tamañoMemoria = parseInt(this.elementos.memoriaTotal.value);
        this.gestorMemoria = new GestorMemoria(tamañoMemoria);
        this.planificador = new Planificador();
        this.contadorProcesos = 0;

        this.enEjecucion = true;
        this.elementos.iniciarSistema.disabled = true;
        this.elementos.pausarSistema.disabled = false;

        this.intervalo = setInterval(() => this.ejecutarCiclo(), 1000 / this.velocidad);

        this.agregarRegistro('Sistema iniciado', 'info');
        this.actualizarInterfaz();
    }

    pausarSimulacion() {
        this.enEjecucion = false;
        clearInterval(this.intervalo);
        this.elementos.iniciarSistema.disabled = false;
        this.elementos.pausarSistema.disabled = true;
        this.agregarRegistro('Simulación pausada', 'advertencia');
    }

    reiniciarSimulacion() {
        this.pausarSimulacion();
        this.detenerGeneracionAutomatica();
        if (this.gestorMemoria) {
            this.gestorMemoria.liberarTodosLosProcesos();
        }
        this.gestorMemoria = null;
        this.planificador = new Planificador();
        this.contadorProcesos = 0;
        this.actualizarInterfaz();
        this.agregarRegistro('Sistema reiniciado', 'info');
    }

    ejecutarCiclo() {
        if (!this.gestorMemoria || !this.enEjecucion) return;

        const algoritmo = this.elementos.algoritmoAsignacion.value;
        this.planificador.asignarRecursos(this.gestorMemoria, algoritmo);
        this.planificador.ejecutarSiguiente();

        this.liberarProcesosTerminados();
        this.actualizarInterfaz();
    }

    liberarProcesosTerminados() {
        const procesosTerminados = this.planificador.procesosTerminados;
        while (procesosTerminados.length > 0) {
            const proceso = procesosTerminados.shift();
            this.gestorMemoria.liberarMemoria(proceso.pid);
            this.agregarRegistro(`Proceso PID-${proceso.pid} terminado (Duración: ${proceso.duración} ciclos)`, 'exito');
        }
    }

    agregarProcesoManual() {
        if (!this.gestorMemoria || !this.enEjecucion) {
            this.agregarRegistro('El sistema no está en ejecución', 'error');
            return;
        }

        const tamaño = parseInt(this.elementos.tamanoProceso.value);
        const duración = parseInt(this.elementos.duracionProceso.value);
        const prioridad = this.elementos.prioridadProceso.value;

        if (tamaño > this.gestorMemoria.tamañoTotal) {
            this.agregarRegistro(`Error: Proceso demasiado grande (${tamaño}KB > ${this.gestorMemoria.tamañoTotal}KB)`, 'error');
            return;
        }

        if (tamaño < 1) {
            this.agregarRegistro('Error: Tamaño de proceso inválido', 'error');
            return;
        }

        this.contadorProcesos++;
        const proceso = new Proceso(this.contadorProcesos, tamaño, duración, prioridad);
        this.planificador.agregarProceso(proceso);

        this.agregarRegistro(`Proceso PID-${proceso.pid} creado (${tamaño}KB, ${duración}ciclos, ${prioridad})`, 'info');
        this.actualizarInterfaz();
    }

    alternarGeneracionAutomatica() {
        if (this.generadorAutomatico) {
            this.detenerGeneracionAutomatica();
        } else {
            this.iniciarGeneracionAutomatica();
        }
    }

    iniciarGeneracionAutomatica() {
        const frecuencia = parseInt(this.elementos.frecuenciaAuto.value) * 1000;
        this.generadorAutomatico = setInterval(() => {
            if (this.enEjecucion) {
                this.generarProcesoAutomatico();
            }
        }, frecuencia);

        this.elementos.generarAutomatico.textContent = 'Detener Generación';
        this.agregarRegistro(`Generación automática activada (${this.elementos.frecuenciaAuto.value}s)`, 'info');
    }

    detenerGeneracionAutomatica() {
        clearInterval(this.generadorAutomatico);
        this.generadorAutomatico = null;
        this.elementos.generarAutomatico.textContent = 'Generar Procesos Automáticos';
        this.agregarRegistro('Generación automática desactivada', 'info');
    }

    generarProcesoAutomatico() {
        const tamaño = Math.floor(Math.random() * 256) + 16;
        const duración = Math.floor(Math.random() * 15) + 1;
        const prioridades = ['baja', 'media', 'alta'];
        const prioridad = prioridades[Math.floor(Math.random() * 3)];

        this.contadorProcesos++;
        const proceso = new Proceso(this.contadorProcesos, tamaño, duración, prioridad);
        this.planificador.agregarProceso(proceso);

        this.agregarRegistro(`Proceso automático PID-${proceso.pid} creado (${tamaño}KB)`, 'info');
    }

    actualizarInterfaz() {
        if (!this.gestorMemoria) {
            this.actualizarEstadoInicial();
            return;
        }

        this.actualizarEstadisticasMemoria();
        this.actualizarMapaMemoria();
        this.actualizarTablaProcesos();
        this.actualizarMetricas();
    }

    actualizarEstadoInicial() {
        this.elementos.memoriaTotalValor.textContent = `${this.elementos.memoriaTotal.value} KB`;
        this.elementos.memoriaLibreValor.textContent = `${this.elementos.memoriaTotal.value} KB`;
        this.elementos.memoriaUsadaValor.textContent = '0 KB';
        this.elementos.fragmentacionValor.textContent = '0%';
        this.elementos.mapaMemoria.innerHTML = '';
        this.elementos.cuerpoTablaProcesos.innerHTML = '';
        this.actualizarBarrasProgreso(0, 0, 0, 0);
    }

    actualizarEstadisticasMemoria() {
        const estadisticas = this.gestorMemoria.obtenerEstadisticasMemoria();
        
        this.elementos.memoriaTotalValor.textContent = `${this.gestorMemoria.tamañoTotal} KB`;
        this.elementos.memoriaLibreValor.textContent = `${estadisticas.memoriaLibre} KB`;
        this.elementos.memoriaUsadaValor.textContent = `${estadisticas.memoriaUsada} KB`;
        this.elementos.fragmentacionValor.textContent = `${estadisticas.fragmentacion.toFixed(1)}%`;
    }

    actualizarMapaMemoria() {
        this.elementos.mapaMemoria.innerHTML = '';
        const anchoTotal = this.elementos.mapaMemoria.clientWidth;

        this.gestorMemoria.bloques.forEach(bloque => {
            const anchoBloque = (this.tamañoBloque(bloque) / this.gestorMemoria.tamañoTotal) * anchoTotal;
            const bloqueElemento = document.createElement('div');
            bloqueElemento.className = `bloque-memoria bloque-memoria--${bloque.libre ? 'libre' : 'ocupado'}`;
            bloqueElemento.style.width = `${Math.max(anchoBloque, 4)}px`;
            
            const infoBloque = `Bloque: ${bloque.inicio}-${bloque.fin} (${this.tamañoBloque(bloque)}KB)`;
            bloqueElemento.title = bloque.libre ? infoBloque : `${infoBloque} - PID: ${bloque.proceso.pid}`;

            if (!bloque.libre) {
                bloqueElemento.textContent = `P${bloque.proceso.pid}`;
                bloqueElemento.title += ` - Estado: ${bloque.proceso.estado}`;
            }

            this.elementos.mapaMemoria.appendChild(bloqueElemento);
        });
    }

    actualizarTablaProcesos() {
        this.elementos.cuerpoTablaProcesos.innerHTML = '';

        const procesosActivos = this.gestorMemoria.obtenerProcesosActivos();
        const todosProcesos = [
            ...this.planificador.colaNuevos,
            ...procesosActivos.ejecutando,
            ...procesosActivos.bloqueados,
            ...this.planificador.procesosTerminados
        ];

        todosProcesos.forEach(proceso => {
            const fila = document.createElement('tr');
            const estadisticas = proceso.obtenerEstadisticas();
            
            fila.innerHTML = `
                <td>${proceso.pid}</td>
                <td>${proceso.tamaño} KB</td>
                <td><span class="estado-proceso estado-proceso--${proceso.estado}">${proceso.estado}</span></td>
                <td>${proceso.direcciónBase !== null ? proceso.direcciónBase : '-'}</td>
                <td>${proceso.duraciónRestante}/${proceso.duración}</td>
                <td>${proceso.prioridad}</td>
                <td>${estadisticas.ciclosEjecutados}</td>
                <td>${estadisticas.vecesBloqueado}</td>
                <td style="display: grid;">
                    <button class="boton boton--pequeno" onclick="simulador.terminarProceso(${proceso.pid})">Terminar</button>
                    ${proceso.estado === 'bloqueado' ? 
                        `<button class="boton boton--pequeno" onclick="simulador.desbloquearProceso(${proceso.pid})">Desbloquear</button>` : 
                        ''}
                </td>
            `;
            this.elementos.cuerpoTablaProcesos.appendChild(fila);
        });
    }

    actualizarMetricas() {
        const tiempoEspera = this.planificador.obtenerTiempoEsperaPromedio();
        const usoMemoria = (this.gestorMemoria.obtenerMemoriaUsada() / this.gestorMemoria.tamañoTotal) * 100;
        const procesosCompletados = this.planificador.procesosCompletados;
        const fragmentacion = this.gestorMemoria.calcularFragmentacion();
        
        const metricasAvanzadas = this.planificador.obtenerMetricasAvanzadas();
        const estadisticasColas = this.planificador.obtenerEstadisticasColas();

        this.elementos.tiempoEsperaPromedio.textContent = `${tiempoEspera.toFixed(1)} ciclos`;
        this.elementos.usoMemoria.textContent = `${usoMemoria.toFixed(1)}%`;
        this.elementos.procesosCompletados.textContent = procesosCompletados;
        this.elementos.tasaFragmentacion.textContent = `${fragmentacion.toFixed(1)}%`;

        this.actualizarBarrasProgreso(tiempoEspera, usoMemoria, procesosCompletados, fragmentacion);
        
        this.actualizarMetricasAvanzadas(metricasAvanzadas, estadisticasColas);
    }

    actualizarBarrasProgreso(tiempoEspera, usoMemoria, procesosCompletados, fragmentacion) {
        const barras = document.querySelectorAll('.barra-progreso__relleno');
        if (barras.length >= 4) {
            barras[0].style.width = `${Math.min(tiempoEspera * 2, 100)}%`;
            barras[1].style.width = `${usoMemoria}%`;
            barras[2].style.width = `${Math.min(procesosCompletados * 5, 100)}%`;
            barras[3].style.width = `${fragmentacion}%`;
        }
    }

    actualizarMetricasAvanzadas(metricas, colas) {
        const metricasElement = document.getElementById('metricasAvanzadas');
        if (!metricasElement) return;
        
        metricasElement.innerHTML = `
            <div class="metrica-avanzada">
                <span>Tiempo Retorno: ${metricas.tiempoRetornoPromedio.toFixed(1)}ms</span>
                <span>Throughput: ${metricas.throughput.toFixed(2)} proc/s</span>
                <span>Utilización CPU: ${metricas.utilizacionCPU.toFixed(1)}%</span>
            </div>
            <div class="estadisticas-colas">
                <span>Nuevos: ${colas.nuevos}</span>
                <span>Listos: ${colas.listos}</span>
                <span>Bloqueados: ${colas.bloqueados}</span>
                <span>Ejecutando: ${colas.ejecutando}</span>
            </div>
        `;
    }

    terminarProceso(pid) {
        if (this.gestorMemoria.liberarMemoria(pid)) {
            this.planificador.removerProceso(pid);
            this.agregarRegistro(`Proceso PID-${pid} terminado manualmente`, 'advertencia');
            this.actualizarInterfaz();
        }
    }

    desbloquearProceso(pid) {
        if (this.gestorMemoria.desbloquearProceso(pid)) {
            this.planificador.agregarAColaListos(this.gestorMemoria.procesos.get(pid));
            this.agregarRegistro(`Proceso PID-${pid} desbloqueado manualmente`, 'info');
            this.actualizarInterfaz();
        }
    }

    agregarRegistro(mensaje, nivel) {
        this.gestorRegistro.agregarEntrada(mensaje, nivel);
    }

    limpiarRegistro() {
        this.gestorRegistro.limpiarRegistro();
    }

    exportarRegistro() {
        this.gestorRegistro.exportarTodo();
    }

    exportarRegistroPorRango() {
        this.gestorRegistro.exportarPorRango();
    }

    tamañoBloque(bloque) {
        return bloque.fin - bloque.inicio + 1;
    }

    ajustarVelocidad() {
        if (this.intervalo) {
            clearInterval(this.intervalo);
            this.intervalo = setInterval(() => this.ejecutarCiclo(), 1000 / this.velocidad);
        }
    }

    obtenerEstadisticasCompletas() {
        if (!this.gestorMemoria) return null;
        
        return {
            memoria: this.gestorMemoria.obtenerEstadisticasMemoria(),
            planificacion: this.planificador.obtenerMetricasAvanzadas(),
            colas: this.planificador.obtenerEstadisticasColas(),
            procesosTotales: this.contadorProcesos
        };
    }
}