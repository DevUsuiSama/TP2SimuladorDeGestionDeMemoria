class Proceso {
    constructor(pid, tamaño, duración, prioridad) {
        this.pid = pid;
        this.tamaño = tamaño;
        this.duración = duración;
        this.duraciónRestante = duración;
        this.prioridad = prioridad;
        this.estado = 'nuevo';
        this.direcciónBase = null;
        this.tiempoLlegada = Date.now();
        this.tiempoInicio = null;
        this.tiempoFinalizacion = null;
    }

    actualizarEstado(nuevoEstado) {
        this.estado = nuevoEstado;
        if (nuevoEstado === 'ejecutando' && !this.tiempoInicio) {
            this.tiempoInicio = Date.now();
        }
        if (nuevoEstado === 'terminado') {
            this.tiempoFinalizacion = Date.now();
        }
    }

    ejecutarCiclo() {
        if (this.estado === 'ejecutando') {
            this.duraciónRestante--;
            if (this.duraciónRestante <= 0) {
                this.actualizarEstado('terminado');
            }
        }
    }
}