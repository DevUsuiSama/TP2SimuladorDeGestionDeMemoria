class GestorMemoria {
    constructor(tamañoTotal) {
        this.tamañoTotal = tamañoTotal;
        this.bloques = [{inicio: 0, fin: tamañoTotal - 1, libre: true, proceso: null}];
        this.procesos = new Map();
        this.procesosBloqueados = new Map();
        this.ultimoPID = 0;
        this.estadisticasFragmentacion = {
            total: 0,
            externa: 0,
            interna: 0,
            historial: []
        };
    }

    asignarMemoriaFirstFit(tamaño) {
        for (let i = 0; i < this.bloques.length; i++) {
            const bloque = this.bloques[i];
            if (bloque.libre && this.tamañoBloque(bloque) >= tamaño) {
                return this.dividirBloque(i, tamaño);
            }
        }
        return null;
    }

    asignarMemoriaBestFit(tamaño) {
        let mejorIndice = -1;
        let mejorTamaño = Infinity;

        for (let i = 0; i < this.bloques.length; i++) {
            const bloque = this.bloques[i];
            const tamañoBloque = this.tamañoBloque(bloque);
            if (bloque.libre && tamañoBloque >= tamaño) {
                if (tamañoBloque < mejorTamaño) {
                    mejorTamaño = tamañoBloque;
                    mejorIndice = i;
                }
            }
        }

        return mejorIndice !== -1 ? this.dividirBloque(mejorIndice, tamaño) : null;
    }

    asignarMemoriaWorstFit(tamaño) {
        let peorIndice = -1;
        let peorTamaño = -1;

        for (let i = 0; i < this.bloques.length; i++) {
            const bloque = this.bloques[i];
            const tamañoBloque = this.tamañoBloque(bloque);
            if (bloque.libre && tamañoBloque >= tamaño) {
                if (tamañoBloque > peorTamaño) {
                    peorTamaño = tamañoBloque;
                    peorIndice = i;
                }
            }
        }

        return peorIndice !== -1 ? this.dividirBloque(peorIndice, tamaño) : null;
    }

    dividirBloque(indice, tamaño) {
        const bloqueOriginal = this.bloques[indice];
        const tamañoOriginal = this.tamañoBloque(bloqueOriginal);
        
        const nuevoBloque = {
            inicio: bloqueOriginal.inicio,
            fin: bloqueOriginal.inicio + tamaño - 1,
            libre: false,
            proceso: null
        };

        if (tamañoOriginal > tamaño) {
            const bloqueRestante = {
                inicio: bloqueOriginal.inicio + tamaño,
                fin: bloqueOriginal.fin,
                libre: true,
                proceso: null
            };
            this.bloques.splice(indice, 1, nuevoBloque, bloqueRestante);
            
            // Calcular fragmentación interna del bloque asignado
            const fragmentacionInterna = tamañoOriginal - tamaño;
            if (fragmentacionInterna > 0) {
                this.estadisticasFragmentacion.interna += fragmentacionInterna;
            }
        } else {
            bloqueOriginal.libre = false;
            this.actualizarEstadisticasFragmentacion();
            return bloqueOriginal;
        }

        this.actualizarEstadisticasFragmentacion();
        return nuevoBloque;
    }

    liberarMemoria(pid) {
        const proceso = this.procesos.get(pid) || this.procesosBloqueados.get(pid);
        if (!proceso) return false;

        for (let i = 0; i < this.bloques.length; i++) {
            if (this.bloques[i].proceso === proceso) {
                this.bloques[i].libre = true;
                this.bloques[i].proceso = null;
                
                this.procesos.delete(pid);
                this.procesosBloqueados.delete(pid);
                
                this.compactarMemoria();
                this.actualizarEstadisticasFragmentacion();
                return true;
            }
        }
        return false;
    }

    bloquearProceso(pid) {
        const proceso = this.procesos.get(pid);
        if (!proceso) return false;

        this.procesos.delete(pid);
        this.procesosBloqueados.set(pid, proceso);
        
        proceso.actualizarEstado('bloqueado');
        return true;
    }

    desbloquearProceso(pid) {
        const proceso = this.procesosBloqueados.get(pid);
        if (!proceso) return false;

        this.procesosBloqueados.delete(pid);
        this.procesos.set(pid, proceso);
        
        proceso.actualizarEstado('listo');
        return true;
    }

    compactarMemoria() {
        let bloquesCompactados = [];
        let bloqueActual = null;

        for (const bloque of this.bloques) {
            if (bloque.libre) {
                if (bloqueActual && bloqueActual.libre) {
                    bloqueActual.fin = bloque.fin;
                } else {
                    bloqueActual = {...bloque};
                    bloquesCompactados.push(bloqueActual);
                }
            } else {
                bloqueActual = null;
                bloquesCompactados.push({...bloque});
            }
        }

        this.bloques = bloquesCompactados;
        this.actualizarEstadisticasFragmentacion();
    }

    tamañoBloque(bloque) {
        return bloque.fin - bloque.inicio + 1;
    }

    calcularFragmentacion() {
        const totalLibre = this.obtenerMemoriaLibre();
        const bloquesLibres = this.bloques.filter(b => b.libre).length;
        
        // Fragmentación externa: memoria libre distribuida en bloques separados
        const fragmentacionExterna = bloquesLibres > 1 ? totalLibre : 0;
        
        // Fragmentación total (externa + interna)
        const fragmentacionTotal = this.estadisticasFragmentacion.externa + 
                                 this.estadisticasFragmentacion.interna;
        
        return {
            porcentajeExterna: (fragmentacionExterna / this.tamañoTotal) * 100,
            porcentajeInterna: (this.estadisticasFragmentacion.interna / this.tamañoTotal) * 100,
            porcentajeTotal: (fragmentacionTotal / this.tamañoTotal) * 100,
            totalKB: fragmentacionTotal,
            externaKB: fragmentacionExterna,
            internaKB: this.estadisticasFragmentacion.interna
        };
    }

    actualizarEstadisticasFragmentacion() {
        const totalLibre = this.obtenerMemoriaLibre();
        const bloquesLibres = this.bloques.filter(b => b.libre).length;
        
        this.estadisticasFragmentacion.externa = bloquesLibres > 1 ? totalLibre : 0;
        this.estadisticasFragmentacion.total = this.estadisticasFragmentacion.externa + 
                                             this.estadisticasFragmentacion.interna;
        
        // Guardar en historial (máximo 100 registros)
        this.estadisticasFragmentacion.historial.push({
            timestamp: Date.now(),
            externa: this.estadisticasFragmentacion.externa,
            interna: this.estadisticasFragmentacion.interna,
            total: this.estadisticasFragmentacion.total
        });
        
        if (this.estadisticasFragmentacion.historial.length > 100) {
            this.estadisticasFragmentacion.historial.shift();
        }
    }

    obtenerMemoriaLibre() {
        return this.bloques
            .filter(b => b.libre)
            .reduce((sum, b) => sum + this.tamañoBloque(b), 0);
    }

    obtenerMemoriaUsada() {
        return this.tamañoTotal - this.obtenerMemoriaLibre();
    }

    obtenerProcesosActivos() {
        return {
            ejecutando: Array.from(this.procesos.values()),
            bloqueados: Array.from(this.procesosBloqueados.values()),
            total: this.procesos.size + this.procesosBloqueados.size
        };
    }

    obtenerEstadisticasMemoria() {
        const memoriaLibre = this.obtenerMemoriaLibre();
        const memoriaUsada = this.obtenerMemoriaUsada();
        const fragmentacion = this.calcularFragmentacion();
        
        return {
            memoriaLibre,
            memoriaUsada,
            fragmentacion,
            bloquesTotales: this.bloques.length,
            bloquesLibres: this.bloques.filter(b => b.libre).length,
            bloquesOcupados: this.bloques.filter(b => !b.libre).length,
            procesosActivos: this.procesos.size,
            procesosBloqueados: this.procesosBloqueados.size,
            detallesFragmentacion: {
                total: `${fragmentacion.porcentajeTotal.toFixed(1)}% (${fragmentacion.totalKB} KB)`,
                externa: `${fragmentacion.porcentajeExterna.toFixed(1)}% (${fragmentacion.externaKB} KB)`,
                interna: `${fragmentacion.porcentajeInterna.toFixed(1)}% (${fragmentacion.internaKB} KB)`
            }
        };
    }

    obtenerMapaMemoria() {
        const fragmentacion = this.calcularFragmentacion();
        
        return this.bloques.map(bloque => ({
            inicio: bloque.inicio,
            fin: bloque.fin,
            tamaño: this.tamañoBloque(bloque),
            libre: bloque.libre,
            fragmentado: bloque.libre && this.tamañoBloque(bloque) < 10, // Pequeños bloques libres
            proceso: bloque.proceso ? {
                pid: bloque.proceso.pid,
                tamaño: bloque.proceso.tamaño,
                estado: bloque.proceso.estado
            } : null,
            infoFragmentacion: {
                esFragmento: bloque.libre && this.tamañoBloque(bloque) < (this.tamañoTotal * 0.05), // < 5% del total
                contribuyeExterna: bloque.libre && fragmentacion.externaKB > 0
            }
        }));
    }

    obtenerResumenFragmentacion() {
        const fragmentacion = this.calcularFragmentacion();
        const bloquesPequeños = this.bloques.filter(b => 
            b.libre && this.tamañoBloque(b) < (this.tamañoTotal * 0.05)
        ).length;
        
        return {
            resumen: `Fragmentación: Total ${fragmentacion.porcentajeTotal.toFixed(1)}% (Externa: ${fragmentacion.porcentajeExterna.toFixed(1)}%, Interna: ${fragmentacion.porcentajeInterna.toFixed(1)}%)`,
            alerta: fragmentacion.porcentajeTotal > 30 ? 'ALTA' : 
                   fragmentacion.porcentajeTotal > 15 ? 'MEDIA' : 'BAJA',
            bloquesPequeños,
            recomendacion: this.obtenerRecomendacionFragmentacion(fragmentacion)
        };
    }

    obtenerRecomendacionFragmentacion(fragmentacion) {
        if (fragmentacion.porcentajeExterna > 20) {
            return 'Considerar compactación de memoria';
        } else if (fragmentacion.porcentajeInterna > 15) {
            return 'Revisar estrategia de asignación (Best Fit recomendado)';
        } else if (fragmentacion.porcentajeTotal > 25) {
            return 'Evaluar aumento de memoria total';
        }
        return 'Estado óptimo';
    }

    verificarIntegridad() {
        let direccionActual = 0;
        
        for (const bloque of this.bloques) {
            if (bloque.inicio !== direccionActual) {
                console.error('Error de integridad: hueco en la memoria', {
                    esperado: direccionActual,
                    encontrado: bloque.inicio
                });
                return false;
            }
            
            if (bloque.fin < bloque.inicio) {
                console.error('Error de integridad: bloque inválido', bloque);
                return false;
            }
            
            direccionActual = bloque.fin + 1;
        }
        
        if (direccionActual > this.tamañoTotal) {
            console.error('Error de integridad: memoria excedida', {
                total: this.tamañoTotal,
                utilizado: direccionActual
            });
            return false;
        }
        
        return true;
    }

    liberarTodosLosProcesos() {
        const pids = Array.from(this.procesos.keys());
        const pidsBloqueados = Array.from(this.procesosBloqueados.keys());
        
        pids.forEach(pid => this.liberarMemoria(pid));
        pidsBloqueados.forEach(pid => this.liberarMemoria(pid));
        
        this.bloques = [{inicio: 0, fin: this.tamañoTotal - 1, libre: true, proceso: null}];
        this.procesos.clear();
        this.procesosBloqueados.clear();
        this.estadisticasFragmentacion = {
            total: 0,
            externa: 0,
            interna: 0,
            historial: []
        };
    }
}