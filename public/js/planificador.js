class Planificador {
    constructor() {
        this.colaListos = [];
        this.colaNuevos = [];
        this.colaBloqueados = [];
        this.procesoEjecutando = null;
        this.procesosTerminados = [];
        this.tiempoEsperaAcumulado = 0;
        this.procesosCompletados = 0;
        this.quantum = 3; // Ciclos máximos de ejecución continua
        this.contadorQuantum = 0;
        this.probabilidadBloqueo = 0.2; // 20% de probabilidad de bloqueo
        this.tiempoMaximoBloqueo = 5; // Ciclos máximos de bloqueo
    }

    agregarProceso(proceso) {
        this.colaNuevos.push(proceso);
        proceso.actualizarEstado('nuevo');
    }

    asignarRecursos(gestorMemoria, algoritmo) {
        for (let i = this.colaNuevos.length - 1; i >= 0; i--) {
            const proceso = this.colaNuevos[i];
            let bloqueAsignado = null;

            switch (algoritmo) {
                case 'firstFit':
                    bloqueAsignado = gestorMemoria.asignarMemoriaFirstFit(proceso.tamaño);
                    break;
                case 'bestFit':
                    bloqueAsignado = gestorMemoria.asignarMemoriaBestFit(proceso.tamaño);
                    break;
                case 'worstFit':
                    bloqueAsignado = gestorMemoria.asignarMemoriaWorstFit(proceso.tamaño);
                    break;
            }

            if (bloqueAsignado) {
                bloqueAsignado.proceso = proceso;
                proceso.direcciónBase = bloqueAsignado.inicio;
                gestorMemoria.procesos.set(proceso.pid, proceso);
                this.colaNuevos.splice(i, 1);
                this.agregarAColaListos(proceso);
                proceso.actualizarEstado('listo');
            }
        }
    }

    agregarAColaListos(proceso) {
        // Ordenar por prioridad (alta > media > baja) y luego por tiempo de llegada
        const prioridadValor = { 'alta': 3, 'media': 2, 'baja': 1 };
        
        let indiceInsercion = this.colaListos.findIndex(p => 
            prioridadValor[p.prioridad] < prioridadValor[proceso.prioridad] ||
            (prioridadValor[p.prioridad] === prioridadValor[proceso.prioridad] && 
             p.tiempoLlegada > proceso.tiempoLlegada)
        );

        if (indiceInsercion === -1) {
            this.colaListos.push(proceso);
        } else {
            this.colaListos.splice(indiceInsercion, 0, proceso);
        }
    }

    ejecutarSiguiente() {
        this.actualizarProcesosBloqueados();
        
        if (this.procesoEjecutando) {
            this.ejecutarProcesoActual();
        }

        if (!this.procesoEjecutando && this.colaListos.length > 0) {
            this.asignarNuevoProceso();
        }

        this.actualizarTiemposEspera();
    }

    ejecutarProcesoActual() {
        this.procesoEjecutando.ejecutarCiclo();
        this.contadorQuantum++;

        // Verificar si el proceso termina naturalmente
        if (this.procesoEjecutando.estado === 'terminado') {
            this.finalizarProceso(this.procesoEjecutando);
            this.contadorQuantum = 0;
            return;
        }

        // Verificar fin de quantum
        if (this.contadorQuantum >= this.quantum) {
            this.interrumpirPorQuantum();
            return;
        }

        // Simular bloqueo por E/S (20% de probabilidad)
        if (Math.random() < this.probabilidadBloqueo && this.contadorQuantum > 1) {
            this.bloquearProceso();
        }
    }

    interrumpirPorQuantum() {
        this.procesoEjecutando.actualizarEstado('listo');
        this.agregarAColaListos(this.procesoEjecutando);
        this.registrarInterrupcion('quantum');
        this.procesoEjecutando = null;
        this.contadorQuantum = 0;
    }

    bloquearProceso() {
        this.procesoEjecutando.actualizarEstado('bloqueado');
        this.procesoEjecutando.tiempoBloqueo = this.tiempoMaximoBloqueo;
        this.colaBloqueados.push(this.procesoEjecutando);
        this.registrarInterrupcion('E/S');
        this.procesoEjecutando = null;
        this.contadorQuantum = 0;
    }

    actualizarProcesosBloqueados() {
        for (let i = this.colaBloqueados.length - 1; i >= 0; i--) {
            const proceso = this.colaBloqueados[i];
            proceso.tiempoBloqueo--;

            if (proceso.tiempoBloqueo <= 0) {
                // Proceso desbloqueado
                this.colaBloqueados.splice(i, 1);
                proceso.actualizarEstado('listo');
                this.agregarAColaListos(proceso);
                this.registrarDesbloqueo(proceso);
            }
        }
    }

    asignarNuevoProceso() {
        this.procesoEjecutando = this.colaListos.shift();
        this.procesoEjecutando.actualizarEstado('ejecutando');
        
        // Calcular tiempo de espera real
        const tiempoEspera = Date.now() - this.procesoEjecutando.tiempoLlegada;
        this.tiempoEsperaAcumulado += tiempoEspera;
        this.procesoEjecutando.tiempoEsperaTotal = (this.procesoEjecutando.tiempoEsperaTotal || 0) + tiempoEspera;
        
        this.contadorQuantum = 0;
    }

    finalizarProceso(proceso) {
        this.procesosTerminados.push(proceso);
        this.procesosCompletados++;
        
        // Registrar métricas finales
        proceso.tiempoRetorno = Date.now() - proceso.tiempoLlegada;
        proceso.tiempoServicio = proceso.duración * 1000; // Aproximación
        
        this.registrarFinalizacion(proceso);
        this.procesoEjecutando = null;
    }

    actualizarTiemposEspera() {
        // Actualizar tiempo de espera en cola de listos
        this.colaListos.forEach(proceso => {
            proceso.tiempoEspera = (proceso.tiempoEspera || 0) + 1;
        });

        // Actualizar tiempo en cola de nuevos
        this.colaNuevos.forEach(proceso => {
            proceso.tiempoEsperaMemoria = (proceso.tiempoEsperaMemoria || 0) + 1;
        });
    }

    obtenerTiempoEsperaPromedio() {
        const procesosConEspera = [
            ...this.procesosTerminados,
            ...this.colaListos,
            ...this.colaBloqueados,
            ...(this.procesoEjecutando ? [this.procesoEjecutando] : [])
        ];

        if (procesosConEspera.length === 0) return 0;

        const tiempoTotal = procesosConEspera.reduce((sum, proceso) => {
            return sum + (proceso.tiempoEsperaTotal || 0);
        }, 0);

        return tiempoTotal / procesosConEspera.length;
    }

    obtenerMetricasAvanzadas() {
        const procesosTerminados = this.procesosTerminados;
        
        if (procesosTerminados.length === 0) {
            return {
                tiempoRetornoPromedio: 0,
                tiempoServicioPromedio: 0,
                throughput: 0,
                utilizacionCPU: 0
            };
        }

        const tiempoRetornoPromedio = procesosTerminados.reduce((sum, p) => 
            sum + p.tiempoRetorno, 0) / procesosTerminados.length;

        const tiempoServicioPromedio = procesosTerminados.reduce((sum, p) => 
            sum + p.tiempoServicio, 0) / procesosTerminados.length;

        const throughput = procesosTerminados.length / 
            (Date.now() - procesosTerminados[0].tiempoLlegada) * 1000;

        const utilizacionCPU = (this.procesosCompletados / 
            (this.procesosCompletados + this.colaListos.length + this.colaBloqueados.length)) * 100;

        return {
            tiempoRetornoPromedio,
            tiempoServicioPromedio,
            throughput,
            utilizacionCPU
        };
    }

    registrarInterrupcion(tipo) {
        console.log(`Interrupción por ${tipo} - PID ${this.procesoEjecutando.pid}`);
    }

    registrarDesbloqueo(proceso) {
        console.log(`Proceso PID ${proceso.pid} desbloqueado`);
    }

    registrarFinalizacion(proceso) {
        console.log(`Proceso PID ${proceso.pid} finalizado - Tiempo retorno: ${proceso.tiempoRetorno}ms`);
    }

    obtenerEstadisticasColas() {
        return {
            nuevos: this.colaNuevos.length,
            listos: this.colaListos.length,
            bloqueados: this.colaBloqueados.length,
            ejecutando: this.procesoEjecutando ? 1 : 0,
            terminados: this.procesosTerminados.length
        };
    }

    cambiarQuantum(nuevoQuantum) {
        this.quantum = Math.max(1, nuevoQuantum);
    }

    cambiarProbabilidadBloqueo(nuevaProbabilidad) {
        this.probabilidadBloqueo = Math.max(0, Math.min(1, nuevaProbabilidad));
    }
}