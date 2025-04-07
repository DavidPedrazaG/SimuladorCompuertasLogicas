// Variables globales
let selected = null;
let connections = [];
let connectFrom = null;
let gates = [];
let inputs = [];
let nextGatePosition = { x: 100, y: 100 };
const validKeys = ["A", "B", "C", "D"];

function and(input1, input2){
    return (input1 && input2)
}

function or(input1, input2){
    return (input1 || input2)
}

function not(value){
    return !value
}

function xor(input1, input2){
    return input1!=input2
}

function nand(input1, input2){
    return !(input1 && input2)
}

function nor(input1, input2){
    return !(input1 || input2)
}

function xnor(input1, input2){
    return !(input1!=input2)
}

let operations = {
    "∧": and,
    "∨": or,
    "⊕": xor,
    '⊼':nand,
	'⊽':nor,
	'⊙':xnor, 
}

function addTableHead(keys, equation, thead){
    const tr = document.createElement("tr")
    let th = document.createElement("th")
    th.scope = "col"
    th.textContent = "Caso"
    tr.appendChild(th)
    for(let key in keys){
        const th = document.createElement("th")
        th.scope = "col"
        th.textContent = keys[key]
        tr.appendChild(th)
    }
    th = document.createElement("th")
    th.scope = "col"
    th.textContent = equation
    tr.appendChild(th)
    thead.appendChild(tr)
	return thead
}

function addTableRow(inputValues, result, caseNumber, tbody){
    const tr = document.createElement("tr")
    const td = document.createElement("td")
    td.textContent = `#${caseNumber}`
    tr.appendChild(td)
    for(let key in inputValues){
        let td = document.createElement("td")
        td.textContent = inputValues[key]
        tr.appendChild(td)
    }
    const th = document.createElement("th")
    th.scope = "row"
    th.textContent = result
    tr.appendChild(th)
    tbody.appendChild(tr)
    return tbody
}

function addTable(table){
	const modalBody = document.getElementById("modal-body")
	modalBody.append(document.createElement("hr"))
	modalBody.append(table)
}

// Tipos de compuertas disponibles
const GATE_TYPES = {
	AND: { inputs: 2, symbol: '∧' },
	OR: { inputs: 2, symbol: '∨' },
	NOT: { inputs: 1, symbol: '¬' },
	NAND: { inputs: 2, symbol: '⊼' },
	NOR: { inputs: 2, symbol: '⊽' },
	XOR: { inputs: 2, symbol: '⊕' },
	XNOR: { inputs: 2, symbol: '⊙' }
};

// Añadir una compuerta al tablero
function addGate(type) {
	const gate = document.createElement("div");
	gate.classList.add("gate", type);
	gate.textContent = type;
	gate.dataset.type = type;
	gate.dataset.value = "?";
	gate.style.left = nextGatePosition.x + "px";
	gate.style.top = nextGatePosition.y + "px";
	gate.id = "gate_" + Date.now();
	
	// Actualizar posición para la próxima compuerta
	nextGatePosition.x += 120;
	if (nextGatePosition.x > window.innerWidth - 200) {
		nextGatePosition.x = 100;
		nextGatePosition.y += 120;
	}
	
	// Crear puertos de entrada
	for (let i = 1; i <= GATE_TYPES[type].inputs; i++) {
		const input = createPort('input', i, gate.id);
		gate.appendChild(input);
	}
	
	// Crear puerto de salida
	const output = createPort('output', null, gate.id);
	gate.appendChild(output);
	
	// Configurar eventos
	gate.onclick = handleGateClick;
	makeDraggable(gate);
	
	document.getElementById("board").appendChild(gate);
	gates.push(gate);
	return gate;
}

// Crear un puerto (entrada o salida)
function createPort(type, number, parentId) {
	const port = document.createElement("div");
	port.classList.add(type);
	if (number) port.classList.add(`input${number}`);
	port.dataset.parent = parentId;
	port.dataset.port = type + (number || '');
	
	port.onclick = handlePortClick;
	return port;
}

// Añadir una entrada al tablero
function addInput(value) {
	const inputIcon = document.createElement("div");
	inputIcon.classList.add("input-icon");
	inputIcon.textContent = value;
	inputIcon.dataset.value = "?";
	inputIcon.dataset.type = "input";
	inputIcon.style.left = "50px";
	inputIcon.style.top = (50 + inputs.length * 80) + "px";
	inputIcon.id = "input_" + value + "_" + Date.now();
	
	// Solo salida
	const output = createPort('output', null, inputIcon.id);
	output.dataset.value = "?";
	inputIcon.appendChild(output);
	
	// Configurar eventos
	inputIcon.onclick = handleInputClick;
	makeDraggable(inputIcon);
	
	document.getElementById("board").appendChild(inputIcon);
	inputs.push(inputIcon);
	return inputIcon;
}

// Manejador de clic en compuertas
function handleGateClick(e) {
	e.stopPropagation();
	if (selected) selected.classList.remove("selected");
	selected = this;
	this.classList.add("selected");
}

// Manejador de clic en entradas
function handleInputClick(e) {
	e.stopPropagation();
	if (selected) selected.classList.remove("selected");
	selected = this;
	this.classList.add("selected");
	
	// Cambiar valor de la entrada al hacer clic (toggle entre 0 y 1)
	if (e.target === this) {
		const currentValue = this.dataset.value;
		const newValue = currentValue === "1" ? "0" : "1";
		this.dataset.value = newValue;
		
		// Actualizar el valor en el puerto de salida
		const output = this.querySelector('.output');
		if (output) {
			output.dataset.value = newValue;
			updateOutputConnections(this.id, newValue);
		}
		
		showNotification(`Entrada ${this.textContent} cambiada a ${newValue}`, "info");
	}
}

// Manejador de clic en puertos
function handlePortClick(e) {
	e.stopPropagation();
	
	// Si ya hay un puerto seleccionado para conectar
	if (connectFrom) {
		connectFrom.style.transform = ""; // Resetear transformación
		
		// Validar la conexión
		if (this !== connectFrom && isValidConnection(connectFrom, this)) {
			createConnection(connectFrom, this);
		} else {
			showNotification("Conexión no válida", "error");
		}
		
		connectFrom = null;
	} 
	// Seleccionar un puerto para iniciar conexión
	else {
		connectFrom = this;
		this.style.transform = "scale(1.3)";
	}
}

// Validar si una conexión es válida
function isValidConnection(from, to) {
	// No permitir conexiones a sí mismo
	if (from === to) return false;
	
	// No permitir conexiones duplicadas
	if (connections.some(conn => 
		conn.from === from && conn.to === to)) {
			return false;
		}
		
		// Solo permitir conexiones de salida a entrada
		return from.classList.contains('output') && 
		to.classList.contains('input');
	}
	
	// Crear una conexión entre puertos
	function createConnection(from, to) {
		const connection = { 
			from, 
			to,
			fromId: from.dataset.parent,
			fromPort: from.dataset.port,
			toId: to.dataset.parent,
			toPort: to.dataset.port
		};
		
		connections.push(connection);
		drawConnections();
		
		// Mostrar notificación
		showNotification(
			`Conexión establecida: ${getElementLabel(from)} → ${getElementLabel(to)}`,
			"success"
		);
		
		// Actualizar valor del puerto de entrada
		updateInputValue(to, from.dataset.value);
	}
	
	// Actualizar el valor de un puerto de entrada
	function updateInputValue(port, value) {
		const parent = document.getElementById(port.dataset.parent);
		if (parent && parent.dataset.type) { // Es una compuerta
			parent.dataset[port.dataset.port] = value;
			evaluateGate(parent);
		}
	}
	
	// Evaluar el valor de una compuerta
	function evaluateGate(gate) {
		const type = gate.dataset.type;
		let result = "?";
		
		if (type === 'NOT') {
			const input = gate.dataset.input1;
			if (input === '0') result = '1';
			else if (input === '1') result = '0';
		} else {
			const input1 = gate.dataset.input1;
			const input2 = gate.dataset.input2;
			
			if (input1 && input2 && input1 !== '?' && input2 !== '?') {
				const a = input1 === '1';
				const b = input2 === '1';
				
				switch (type) {
					case 'AND': result = (a && b) ? '1' : '0'; break;
					case 'OR': result = (a || b) ? '1' : '0'; break;
					case 'NAND': result = !(a && b) ? '1' : '0'; break;
					case 'NOR': result = !(a || b) ? '1' : '0'; break;
					case 'XOR': result = (a !== b) ? '1' : '0'; break;
					case 'XNOR': result = (a === b) ? '1' : '0'; break;
				}
			}
		}
		
		gate.dataset.value = result;
		
		// Actualizar las conexiones salientes
		updateOutputConnections(gate.id, result);
	}
	
	// Actualizar conexiones salientes
	function updateOutputConnections(gateId, value) {
		connections
		.filter(conn => conn.fromId === gateId && conn.fromPort === 'output')
		.forEach(conn => {
			conn.from.dataset.value = value;
			updateInputValue(conn.to, value);
		});
	}
	
	// Obtener etiqueta descriptiva de un elemento
	function getElementLabel(element) {
		const parent = document.getElementById(element.dataset.parent);
		if (parent.dataset.type) { // Es una compuerta
			return `${parent.dataset.type} (${element.dataset.port})`;
		} else { // Es una entrada
			return `${parent.textContent} (${element.dataset.port})`;
		}
	}
	
	// Mostrar notificación
	function showNotification(message, type = "info") {
		const notification = document.getElementById('notification');
		notification.textContent = message;
		notification.style.display = 'block';
		notification.style.backgroundColor = type === "error" ? '#e74c3c' : 
		type === "success" ? '#2ecc71' : 
		'var(--notification-color)';
		
		setTimeout(() => {
			notification.style.display = 'none';
		}, 3000);
	}
	
	// Calcular la fórmula lógica
	function calculateFormula() {
		// Encontrar las compuertas finales (no conectadas a otras)
		const outputGates = gates.filter(gate => {
			return !connections.some(conn => conn.fromId === gate.id);
		});
		
		if (outputGates.length === 0) {
			showNotification("No hay compuertas de salida", "error");
			return;
		}
		
		// Construir fórmulas para cada compuerta de salida
		const formulas = outputGates.map(gate => 
			buildFormula(gate.id, {}, new Set())
		);

        const modalBody = document.getElementById("modal-body")
        modalBody.innerHTML = ``
		
		formulas.forEach(formula =>{
			
			const table = document.createElement("table")
            table.className = "table table-striped-columns"
			let thead = document.createElement("thead")
			let tbody = document.createElement("tbody")

			const keys = [...new Set(
				formula
					.split("")
					.filter(char => validKeys.includes(char))
			)];
	
			thead = addTableHead(keys, formula, thead)
	
			const totalCombos = Math.pow(2, keys.length);
			for (let i = 0; i < totalCombos; i++) {
				const binary = i.toString(2).padStart(keys.length, '0');
				const inputValues = {};
			
				binary.split('').forEach((bit, index) => {
					inputValues[keys[index]] = parseInt(bit);
				});
				if(!inputValues.hasOwnProperty(undefined)){
					tbody = addTableRow(inputValues, trade(formula, inputValues),i+1, tbody)
				}
			}

			table.appendChild(thead)
			table.appendChild(tbody)
			addTable(table)
		})
		
		const modalElemento = document.getElementById("modal");
		if (modalElemento) {
			const modal = new bootstrap.Modal(modalElemento);
			modal.show();
		}
		
		// Mostrar la fórmula
		const formulaDiv = document.getElementById('formula-content');
		formulaDiv.innerHTML = formulas.join('<br><br>');
		
		const formulaContainer = document.getElementById('formula');
		formulaContainer.style.display = 'block';
	}
	
	// Construir fórmula recursivamente
	function buildFormula(gateId, visited, path) {
		if (path.has(gateId)) {
			return "[Ciclo detectado]";
		}
		
		path.add(gateId);
		visited[gateId] = true;
		
		const gate = document.getElementById(gateId);
		const type = gate.dataset.type;
		const symbol = GATE_TYPES[type].symbol;
		
		// Obtener fórmulas de las entradas
		const inputFormulas = [];
		for (let i = 1; i <= GATE_TYPES[type].inputs; i++) {
			const inputPort = `input${i}`;
			const inputConn = connections.find(conn => 
				conn.toId === gateId && conn.toPort === inputPort
			);
			
			if (!inputConn) {
				inputFormulas.push("?");
			} else if (inputConn.fromId.startsWith('input_')) {
				const input = document.getElementById(inputConn.fromId);
				inputFormulas.push(input.textContent);
			} else {
				inputFormulas.push(buildFormula(inputConn.fromId, visited, new Set(path)));
			}
		}
		
		// Construir fórmula según el tipo de compuerta
		switch (type) {
			case 'NOT':
			return `¬[${inputFormulas[0]}]`;
			case 'AND':
			case 'OR':
			case 'NAND':
			case 'NOR':
			case 'XOR':
			case 'XNOR':
			return `(${inputFormulas.join(` ${symbol} `)})`;
			default:
			return `${type}(${inputFormulas.join(', ')})`;
		}
	}
	
	// Generar todas las combinaciones posibles de valores booleanos
	function generateCombinations(n) {
		const total = Math.pow(2, n);
		const combinations = [];
		
		for (let i = 0; i < total; i++) {
			const comb = [];
			for (let j = 0; j < n; j++) {
				comb.push((i >> j) & 1);
			}
			combinations.push(comb.reverse());
		}
		
		return combinations;
	}
	
	// Evaluar todas las compuertas en orden correcto
	function evaluateAllGates() {
		const evaluated = new Set();
		const inProgress = new Set();
		
		gates.forEach(gate => {
			if (!evaluated.has(gate.id)) {
				evaluateGateRecursive(gate.id, evaluated, inProgress);
			}
		});
	}
	
	// Evaluar compuerta recursivamente (ordenamiento topológico)
	function evaluateGateRecursive(gateId, evaluated, inProgress) {
		if (evaluated.has(gateId)) return;
		if (inProgress.has(gateId)) {
			console.warn("Circuito contiene ciclo");
			return;
		}
		
		inProgress.add(gateId);
		const gate = document.getElementById(gateId);
		
		// Evaluar primero todas las entradas
		for (let i = 1; i <= GATE_TYPES[gate.dataset.type].inputs; i++) {
			const inputPort = `input${i}`;
			const inputConn = connections.find(conn => 
				conn.toId === gateId && conn.toPort === inputPort
			);
			
			if (inputConn && inputConn.fromId.startsWith('gate_')) {
				evaluateGateRecursive(inputConn.fromId, evaluated, inProgress);
			}
		}
		
		// Ahora evaluar esta compuerta
		evaluateGate(gate);
		evaluated.add(gateId);
		inProgress.delete(gateId);
	}
	
	function makeDraggable(el) {
		let offsetX, offsetY;
		let isDragging = false;
	
		el.onmousedown = function (e) {
			if (e.target !== el && !e.target.classList.contains('output')) return;
	
			const board = document.getElementById("board");
			const boardRect = board.getBoundingClientRect();
	
			isDragging = true;
			offsetX = e.clientX - el.getBoundingClientRect().left;
			offsetY = e.clientY - el.getBoundingClientRect().top;
	
			el.style.position = "absolute";
			el.style.zIndex = 1000;
	
			document.onmousemove = function (e) {
				if (!isDragging) return;
	
				let x = e.clientX - boardRect.left - offsetX;
				let y = e.clientY - boardRect.top - offsetY;
	
				const maxX = board.clientWidth - el.offsetWidth;
				const maxY = board.clientHeight - el.offsetHeight;
	
				x = Math.max(0, Math.min(x, maxX));
				y = Math.max(0, Math.min(y, maxY));
	
				el.style.left = `${x}px`;
				el.style.top = `${y}px`;
	
				drawConnections?.();
			};
	
			document.onmouseup = function () {
				isDragging = false;
				el.style.zIndex = "";
				document.onmousemove = null;
				document.onmouseup = null;
			};
		};
	}	
	
	// Eliminar elemento seleccionado
	function deleteSelected() {
		if (selected) {
			// Eliminar conexiones relacionadas
			connections = connections.filter(c =>
				!selected.contains(c.from) && !selected.contains(c.to)
			);
			
			// Eliminar de las listas
			if (selected.classList.contains('gate')) {
				gates = gates.filter(g => g !== selected);
			} else if (selected.classList.contains('input-icon')) {
				inputs = inputs.filter(i => i !== selected);
			}
			
			selected.remove();
			drawConnections();
			selected = null;
			
			showNotification("Elemento eliminado", "info");
		}
	}
	
	// Limpiar todo el workspace
	function clearWorkspace() {
		if (confirm("¿Estás seguro de que quieres limpiar todo el espacio de trabajo?")) {
			gates.forEach(gate => gate.remove());
			inputs.forEach(input => input.remove());
			
			gates = [];
			inputs = [];
			connections = [];
			selected = null;
			connectFrom = null;
			nextGatePosition = { x: 100, y: 100 };
			
			document.getElementById('connections').innerHTML = '';
			document.getElementById('formula').style.display = 'none';
			document.getElementById('truth-table').style.display = 'none';
			
			showNotification("Espacio de trabajo limpiado", "info");
		}
	}
	
	// Dibujar todas las conexiones
	function drawConnections() {
		const svg = document.getElementById("connections");
		svg.innerHTML = '<defs><marker id="arrowhead" markerWidth="10" markerHeight="7" refX="9" refY="3.5" orient="auto"><polygon points="0 0, 10 3.5, 0 7" fill="var(--connection-color)"/></marker></defs>';
		
		connections.forEach(({ from, to }) => {
			const fromRect = from.getBoundingClientRect();
			const toRect = to.getBoundingClientRect();
			const boardRect = document.getElementById("board").getBoundingClientRect();
			
			const x1 = fromRect.left + fromRect.width / 2 - boardRect.left;
			const y1 = fromRect.top + fromRect.height / 2 - boardRect.top;
			const x2 = toRect.left + toRect.width / 2 - boardRect.left;
			const y2 = toRect.top + toRect.height / 2 - boardRect.top;
			
			const line = document.createElementNS("http://www.w3.org/2000/svg", "line");
			line.setAttribute("x1", x1);
			line.setAttribute("y1", y1);
			line.setAttribute("x2", x2);
			line.setAttribute("y2", y2);
			line.classList.add("line");
			
			// Estilo diferente para conexiones con valor conocido
			if (from.dataset.value && from.dataset.value !== '?') {
				line.style.stroke = from.dataset.value === '1' ? '#2ecc71' : '#e74c3c';
				line.style.strokeWidth = '4';
			}
			
			svg.appendChild(line);
		});
	}
	
	function trade(equation, inputValues){
		equation = equation+"|"
		equation = equation.replace(/\s+/g, '');
		
		let values = [];
		let bracketsValues = [];
		let operation = null;
		let bracketsOperation = null;
		let result = null;
		let brackets = false;
		
		let chars = equation.split(""); // Lo hacemos array pa' manipularlo
        for (let i = 0; i < chars.length; i++) {
            let char = chars[i];        
			if (values.length === 2 && operation) {
				result = operation(values[0], values[1]);
				operation = null;
				values = [result];
			}
			
			if (char === "(") {
				brackets = true;
				
			} else if (char === "]") {
                if (brackets) {
					bracketsValues[bracketsValues.length - 1] = not(bracketsValues[bracketsValues.length - 1]);
				} else {
					values[values.length - 1] = not(values[values.length - 1]);
				}
			} else if (inputValues.hasOwnProperty(char)) {
				if (brackets) {
					bracketsValues.push(inputValues[char]);
				} else {
					values.push(inputValues[char]);
				}
				
			} else if (operations.hasOwnProperty(char)) {
				if (brackets) {
					bracketsOperation = operations[char];
				} else {
					operation = operations[char];
				}
				
			} else if (char === ")" && brackets) {
				if (bracketsValues.length === 1) {
					values.push(bracketsValues[0]);
				} else {
					values.push(bracketsOperation(bracketsValues[0], bracketsValues[1]));
				}
				
				brackets = false;
				bracketsOperation = null;
				bracketsValues = [];
			}
			
			if (char === "|" && values.length == 1) {
				return values[0] ? 1 : 0
			}
		}
		return result ? 1 : 0
	}
	
	// Evento para hacer clic en el fondo
	document.getElementById("board").onclick = function(e) {
		if (e.target === this) {
			if (selected) {
				selected.classList.remove("selected");
				selected = null;
			}
			if (connectFrom) {
				connectFrom.style.transform = "";
				connectFrom = null;
			}
		}
	};
	
	// Inicialización
	document.addEventListener('DOMContentLoaded', () => {
		// Añadir entradas por defecto
		addInput('A');
		addInput('B');
		addInput('C');
		addInput('D');
		
		// Posición inicial para nuevas compuertas
		nextGatePosition = { x: 300, y: 100 };
	});