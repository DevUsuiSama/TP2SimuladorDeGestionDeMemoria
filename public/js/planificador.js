class Planificador {
    constructor() {
        this.colaListos = [];
        this.colaNuevos = [];
        this.procesoEjecutando = null;
        this.procesosTerminados = [];
        this.tiempoEsperaAcumulado = 0;
        this.procesosCompletados = 0;
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
                this.colaListos.push(proceso);
                proceso.actualizarEstado('listo');
            }
        }
    }

    ejecutarSiguiente() {
        if (this.procesoEjecutando) {
            this.procesoEjecutando.ejecutarCiclo();
            
            if (this.procesoEjecutando.estado === 'terminado') {
                this.procesosTerminados.push(this.procesoEjecutando);
                this.procesosCompletados++;
                this.procesoEjecutando = null;
            }
        }

        if (!this.procesoEjecutando && this.colaListos.length > 0) {
            this.procesoEjecutando = this.colaListos.shift();
            this.procesoEjecutando.actualizarEstado('ejecutando');
            
            const tiempoEspera = Date.now() - this.procesoEjecutando.tiempoLlegada;
            this.tiempoEsperaAcumulado += tiempoEspera;
        }

        this.actualizarTiemposEspera();
    }

    actualizarTiemposEspera() {
        this.colaListos.forEach(proceso => {
            proceso.tiempoEspera = (proceso.tiempoEspera || 0) + 1;
        });
    }

    obtenerTiempoEsperaPromedio() {
        const totalProcesos = this.procesosTerminados.length + 
                             (this.procesoEjecutando ? 1 : 0) + 
                             this.colaListos.length;
        
        if (totalProcesos === 0) return 0;
        
        return this.tiempoEsperaAcumulado / totalProcesos;
    }
}
