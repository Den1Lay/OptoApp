function setBaudrateDropdown(value) {
	const port_baudrate = document.getElementById('port-baudrate');
	
	port_baudrate.value = value;
}

function setRegAddress(value) {
	const reg_1_address = document.getElementById('reg_1_address');
	reg_1_address.value = value;
}

function getHex(ar) {
	return ar.map(el => {
		const elHex = el.toString(16).toUpperCase();
		return elHex.length < 2 ? "0"+elHex : elHex;
	})
}

function toHexWithZero(str) {
	const el = str.toString(16).toUpperCase();
	return el.length < 2 ? "0"+el : el;
}
