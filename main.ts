const SSID: string = "INFINITUM0I6B_2.4"
const PASSWORD: string = "NHTy46VqSs"
const PUERTO_API: string = "5690"
const DIRECCION_API: string = "192.168.1.142"
const RESPUESTA: number = 7

let cadena_serial: string = ""

const periodo: number = 50
let numero_gesto: number = 0
let serie_tiempo = {
    x: [0,1,2,3],
    y: [4,5,6,7],
    z: [8,9,10,11]
}


function enviar_AT(comando: string, tiempo_espera: number = 100) {
    serial.writeString(comando + "\u000D\u000A")
    basic.pause(tiempo_espera)
}
function esperar_respuesta(estado: string, estado_error: boolean = false): boolean {
    let resultado: boolean = false
    let tiempo_inicio: number = input.runningTime()

    while (true) {
        cadena_serial += serial.readString()
        if (cadena_serial.includes(estado)) {
            resultado = true
            break
        }
        if (estado_error) {
            if (cadena_serial.includes("ERROR")) {
                resultado = false
                break
            }
        }
        if (input.runningTime() - tiempo_inicio > 50000) break
    }
    return resultado
}
function comando_AT(comando: string, estado: string, tiempo_espera: number = 1000, limpiar_serial: boolean = true) {
    enviar_AT(comando)
    let exito: boolean = esperar_respuesta(estado)
    if (limpiar_serial) cadena_serial = ""
    return exito
}
function limpiar_serie_tiempo() {
    serie_tiempo.x = []
    serie_tiempo.y = []
    serie_tiempo.z = []
}
function crear_peticion_HTTP(metodo: string, pagina: string, contenido: string, contenido_json: boolean = false) {
    return `${metodo} ${pagina}${(!contenido_json && contenido.length > 0 ? "?" + contenido : "")} HTTP/1.1\r\nHost:${DIRECCION_API}\r\nAccept: ${(contenido_json ? "application/json" : "text/plain")}\r\nContent-Type: ${(contenido_json ? "application/json" : "text/plain")}\r\n${contenido_json ? `Content-Length: ${contenido.length}` : ""}\r\n\r\n${contenido}`
}
function recuperar_respuesta() {
    const contenido: number = parseInt(cadena_serial[cadena_serial.indexOf("content-length") + 16]) - RESPUESTA
    return cadena_serial.substr(cadena_serial.length - contenido - 1, contenido)
}
function solicitar_api(metodo: string, pagina: string, contenido: string, contenido_json: boolean) {
    if (!comando_AT("AT+CIPSTART=\"TCP\",\"" + DIRECCION_API + "\"," + PUERTO_API, "OK", 3000)) {
        basic.showString("E0")
        return "E0"
    }

    let peticion_http: string = crear_peticion_HTTP(metodo, pagina, contenido, true)
    if (!comando_AT("AT+CIPSEND=" + peticion_http.length, "OK", 3000)) {
        basic.showString("E1")
        return "E1"
    }

    if (!comando_AT(peticion_http, "resp:", 3000, false)) {
        basic.showString("E2")
        return "E2"
    }

    let respuesta: string = cadena_serial
    cadena_serial = ""

    if (!comando_AT("AT+CIPCLOSE", "OK")) {
        basic.showString("E3")
        return "E3"
    }

    cadena_serial = respuesta
    return recuperar_respuesta()
}


function inicializacion() {
    basic.showIcon(IconNames.Ghost)
    serial.redirect(SerialPin.P0, SerialPin.P1, 115200) //Se asignan los pines que funcionarán como Receptor(Rx) y Emisor(Tx)
    serial.setRxBufferSize(500)
    serial.setTxBufferSize(500)
    comando_AT("AT+RESTORE", "OK") //Recupera configuración de fábrica por defecto
    comando_AT("AT+RST", "OK") //Uilizado para reiniciar la función del módulo
}
function configurar_modo() {
    basic.showIcon(IconNames.Pitchfork)
    comando_AT("AT+CWMODE=1", "OK") //Asigna modo estación(Station) como dispositivo conectado a una red existente
    comando_AT("AT+CWJAP=\"" + SSID + "\",\"" + PASSWORD + "\"", "OK", 3000) //Permite la conexión a una red existente o Access Point(AP)
}
function captacion_gestos() {
    basic.showIcon(IconNames.Target)
    numero_gesto = -1

    numero_gesto = parseInt(solicitar_api("POST", "/pruebas/body-json", JSON.stringify(serie_tiempo), true))

    basic.showIcon(IconNames.Happy)
}


function main() {
    inicializacion()
    configurar_modo()
    captacion_gestos()
}
main()