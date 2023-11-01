function modbusCRC(message) {

	let crc = new Uint16Array([0xFFFF]);
	for(sInd in message) {
		crc ^= message[sInd];
		for(let i = 8; i != 0; i--) {
			if((crc & 0x0001) != 0) {
				crc >>= 1;
				crc ^= 0xA001;
			} else {
				crc >>= 1;
			}
		}
	}
	// сначала младший бит, а уже затем старший
	const newRes = [crc & 0xFF, crc >> 8];
	return newRes;
}

// const message = new Uint8Array([0x01, 0x02]);
// setTimeout(() => modbusCRC(message), 1000);

// console.log(`Modbus CRC_bin: ${resCRC[0].toString(2)}`);
// console.log(`Modbus CRC_hex: ${resCRC[0].toString(16)}`);