class Proceso {
    constructor(pid, tamaño, duración, prioridad) {
        this.pid = pid;
        this.tamaño = tamaño;
        this.duración = duración;
        this.duraciónRestante = duración;
        this.prioridad = prioridad;
        this.estado = 'nuevo';
        this.direcciónBase = null;
        
        // Timestamps para métricas
        this.tiempoLlegada = Date.now();
        this.tiempoInicio = null;
        this.tiempoFinalizacion = null;
        this.tiempoUltimoBloqueo = null;
        
        // Contadores de tiempo
        this.tiempoEsperaTotal = 0;
        this.tiempoEsperaMemoria = 0;
        this.tiempoEjecucion = 0;
        this.tiempoBloqueo = 0;
        this.ciclosEjecutados = 0;
        
        // Información de bloqueo
        this.tiempoBloqueoRestante = 0;
        this.motivoBloqueo = null;
        this.vecesBloqueado = 0;
        
        // Estadísticas de planificación
        this.cambiosContexto = 0;
        this.interrupcionesQuantum = 0;
        this.quantumUtilizado = 0;
    }

    actualizarEstado(nuevoEstado) {
        const estadoAnterior = this.estado;
        this.estado = nuevoEstado;
        
        const ahora = Date.now();
        
        switch (nuevoEstado) {
            case 'ejecutando':
                if (!this.tiempoInicio) {
                    this.tiempoInicio = ahora;
                }
                this.cambiosContexto++;
                break;
                
            case 'bloqueado':
                this.tiempoUltimoBloqueo = ahora;
                this.vecesBloqueado++;
                this.motivoBloqueo = 'E/S';
                break;
                
            case 'listo':
                if (estadoAnterior === 'bloqueado') {
                    this.tiempoBloqueo += ahora - this.tiempoUltimoBloqueo;
                }
                break;
                
            case 'terminado':
                this.tiempoFinalizacion = ahora;
                this.calcularMetricasFinales();
                break;
        }
    }

    ejecutarCiclo() {
        if (this.estado === 'ejecutando') {
            this.duraciónRestante--;
            this.ciclosEjecutados++;
            this.tiempoEjecucion += 1000 / 60; // Aproximación de tiempo por ciclo
            
            this.quantumUtilizado++;
            
            if (this.duraciónRestante <= 0) {
                this.actualizarEstado('terminado');
                return true; // Proceso terminado
            }
        }
        return false; // Proceso aún activo
    }

    bloquear(tiempoBloqueo, motivo = 'E/S') {
        this.tiempoBloqueoRestante = tiempoBloqueo;
        this.motivoBloqueo = motivo;
        this.actualizarEstado('bloqueado');
    }

    desbloquear() {
        this.tiempoBloqueoRestante = 0;
        this.motivoBloqueo = null;
        this.actualizarEstado('listo');
    }

    actualizarTiempoBloqueo() {
        if (this.estado === 'bloqueado' && this.tiempoBloqueoRestante > 0) {
            this.tiempoBloqueoRestante--;
            if (this.tiempoBloqueoRestante <= 0) {
                this.desbloquear();
                return true; // Desbloqueado
            }
        }
        return false; // Sigue bloqueado
    }

    calcularMetricasFinales() {
        this.tiempoRetorno = this.tiempoFinalizacion - this.tiempoLlegada;
        this.tiempoServicio = this.tiempoEjecucion;
        this.tiempoEsperaTotal = this.tiempoRetorno - this.tiempoServicio;
        
        // Calcular eficiencia
        this.eficiencia = (this.tiempoServicio / this.tiempoRetorno) * 100;
        
        // Estadísticas de uso de recursos
        this.tasaBloqueo = this.vecesBloqueado > 0 ? 
            (this.tiempoBloqueo / this.tiempoRetorno) * 100 : 0;
    }

    obtenerEstadisticas() {
        return {
            pid: this.pid,
            estado: this.estado,
            tamaño: this.tamaño,
            duracionOriginal: this.duración,
            duracionRestante: this.duraciónRestante,
            prioridad: this.prioridad,
            tiempoLlegada: this.tiempoLlegada,
            tiempoEjecucion: this.tiempoEjecucion,
            tiempoEsperaTotal: this.tiempoEsperaTotal,
            tiempoBloqueo: this.tiempoBloqueo,
            ciclosEjecutados: this.ciclosEjecutados,
            vecesBloqueado: this.vecesBloqueado,
            cambiosContexto: this.cambiosContexto,
            interrupcionesQuantum: this.interrupcionesQuantum,
            quantumUtilizado: this.quantumUtilizado,
            direccionBase: this.direcciónBase,
            eficiencia: this.eficiencia || 0,
            tasaBloqueo: this.tasaBloqueo || 0
        };
    }

    reiniciarQuantum() {
        this.quantumUtilizado = 0;
    }

    registrarInterrupcionQuantum() {
        this.interrupcionesQuantum++;
    }

    actualizarTiempoEspera() {
        if (this.estado === 'listo' || this.estado === 'nuevo') {
            this.tiempoEsperaTotal += 1000 / 60; // Aproximación por ciclo
            
            if (this.estado === 'nuevo') {
                this.tiempoEsperaMemoria += 1000 / 60;
            }
        }
    }

    esElegibleParaEjecucion() {
        return this.estado === 'listo' && this.duraciónRestante > 0;
    }

    necesitaMemoria() {
        return this.estado === 'nuevo' && this.direcciónBase === null;
    }

    puedeSerPlanificado() {
        return this.estado !== 'terminado' && this.estado !== 'bloqueado';
    }

    obtenerInformacionEjecucion() {
        return {
            pid: this.pid,
            estado: this.estado,
            duracionRestante: this.duraciónRestante,
            tiempoBloqueoRestante: this.tiempoBloqueoRestante,
            prioridad: this.prioridad,
            quantumUtilizado: this.quantumUtilizado,
            motivoBloqueo: this.motivoBloqueo
        };
    }
}