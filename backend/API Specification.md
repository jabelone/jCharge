# kCharge Control API Specification
## Purpose of document
The purpose of this document is to outline a standardised API for integrating different cell testing devices into the kCharge Control software. This specification will focus on integrating a cell testing device with the kCharge Control backend server and will not include any part of the front end or front end API.

## Meta
Protocol Version: **1 [DRAFT]**

## Overview
The kCharge Control protocol is web socket based. Websockets were specifically chosen over socket.io due to the easier implementation on embedded microcontroller platforms. The protocol is a defined set of JSON messages to send data to the kCharge Control backend server, and to send control messages to testing devices.

## General protocol requirements

* Each websocket message  **must** contain **exactly one** kCharge Control packet.
* The kCharge Control server **should** ignore any packets that don't meet the specification.
* The kCharge Control server **may** attempt to log or display an error message if it receives a packet that doesn't meet the specification.
* The kCharge Control server **should** treat malformed JSON as a packet that doesn't meet the specification but **may** process the packet if the JSON can be parsed and the resulting object meets the specification.
* Any breaking changes or updates to the specification **must** result in an increase to the protocol version.
* A kCharge Protocol parser **should** check the version number and refuse to parse a packet if it does not match the expected value(s).
* The protocol is designed to be mostly stateless and there is no requirement for acknowledgements etc.
* A device can be fully automated and the kCharge backend server / UI is simply monitoring a device, the device can be fully controlled by the kCharge backend server / UI, or a mixture of both.

## Packet format
A kCharge Control packet is defined as a single JSON object that follows the format below. Each packet's example object **must** be put in the `payload` key to form a valid kCharge Control packet. The `deviceId` must be unique and **must** be included in all packets to and from a device.

```
{
	"version": 1,
	"command": "commandName",
	"deviceId": "1",
	"payload": {}
}
```

## Auto Discovery
The kCharge Control protocol defines an auto discovery mechanism to help testing devices discover a kCharge Control server on the local network. A testing device **should** implement auto discovery, but if it chooses not to, this section **may** be ignored. This is separate from the auto discovery method implemented by the kCharge app that uses mDNS (ie Bonjour/Zeroconf) for discovery and socket.io for communication.

The auto discovery mechanism works as follows:

* There **must** be no more than **one** kCharge Control backend server on a network. The behaviour of multiple backend servers on a network is *undefined*.
* Every 3-10 seconds the kCharge Control server **must** send out a `hello` packet to the broadcast address on port `54321`.
* Once a testing device receives a `hello` packet, it **should** attempt to open a websocket connection to the IP address and port included in the `hello` packet.
* A testing device **must** send a `helloServer` packet before any other packets after opening a websocket connection.
* A kCharge backend server **may** choose to close the websocket connection, or, wait for a valid `helloServer` packet before attempting to parse any more packets from that device.

## Command Definitions
Each command definition below is a valid kCharge Control command. Any commands *not* listed below **must** be ignored. The title of each command definition should be used in the `command` key and the object listed under each title should be used in the `payload` key of the kCharge Control Packet. Each command **should** only be sent to the devices listed under each command (ie only to server or only to a device).

A `device` is a battery cell charger/discharger etc. that is connecting to a kCharge Control backend.

--

### Command `hello`

**Sent to:** device

#### Payload

```javascript
{
	"serverHost": "192.168.0.42:12345",
	"time": 1608127015,
	"serverName": "name_of_server"
}
```

#### Notes
* `websocketHost` is the full host and port that **should** be connected to via a websocket.
* `apiHost` is the full host and port that other devices (ie frontend/app) can use to connect via the HTTP API.
* `time` is the current time in seconds since the unix epoch and **may** be used by a device.
* `serverName` is the name of the backend server and **may** be used by a device.

--

### Command `helloServer`

**Sent to:** server

#### Payload
```javascript
{
	"id": "unique_identifier_of_device",
	"deviceName": "name_of_device" | null,
	"deviceManufacturer": "manufacturer_of_device" | null,
	"deviceModel": "model_or_type_of_device" | null,
	"capabilities": {
		"channels": 8,
		"charge": false,
		"discharge": true,
		"configurableChargeCurrent": false,
		"configurableDischargeCurrent": false,
		"configurableChargeVoltage": false,
		"configurableDischargeVoltage": true
	}
}
```

#### Notes

* `id` must be unique. If a backend server receives a duplicate device ID, it **must** ignore the second device.
* `deviceName` can be an optional string or `null`. This value **may** be overidden by a user in the UI.
* `deviceManufacturer` and `deviceModel` are both optional and can be a string or `null`. Used for display purposes.
* `channels` specify the number of channels that can be controlled and are expected when reporting status.
* `charge` and `discharge` specify if the device supports charging or discharging but the rate is not configurable.
* `configurableChargeCurrent` and `configurableDischargeCurrent` specify if the device supports charging or discharging at a configurable current.
* `configurableChargeVoltage` and `configurableDischargeVoltage` specify if the device supports charging or discharging with a configurable voltage cutoff.
* The `deviceId` is not needed in other packets because the server keeps track of each socket connection separately.

--

### Command `deviceStatus`

**Sent to:** server

#### Payload
```javascript
{
	"channels": [
		{
			"id": channel_id,
			"state": "empty" | "idle" | "complete" | "charging" | "discharging" | "overVoltage" | "underVoltage" | "overTemperature" | "error",
			"stage": "arbitrary_string",
			"current": 1900,
			"voltage": 4200,
			"temperature": 25,
			"capacity": 1300
		}
	]
}
```

#### Notes

* `channels` must contain an array of channel objects for *all* device channels. Channels **should** be sorted numerically (ie 1, 2, 3) based on the `id` when viewing in the UI.
* `id` **must** be unique per device and **must** be a number.
* `state` **must** contain one of the options defined above. `empty` means no cell detected and `idle` means a cell is detected but nothing is currently happening.
* `stage` may be specified or set to null. A device can specify what stage of the state it's at (e.g. it could be "resting" to allow voltage to settle before performing an IR measurement, etc.)
* `current` is the current measured on the channel in mA.
* `voltage` is the voltage measured on the channel in mV.
* `temperature` is the temperature measured on the channel in degrees Celsius. It **must** be a number or `null`.
* `capacity` is the current capacity (so far) of the cell in the channel in mAh. It **may** remain at the last measured capacity, or return to 0 after a discharge is finished. This behaviour is up to the device's firmware. It **must** be a positive integer, or 0.
* A device **may** send a `deviceStatus` message as often as reasonable (for example each time a channel status or measurement changes) but **should** be about every 1-5 seconds.

#### LED Guidelines
For devices that have a status LED on each channel (or another similar status interface) the following colours and animations **should** be used for the following states:

* Empty (ready for cell insertion) - solid blue
* Idle (cell inserted, but no current action) - solid orange
* Action in progress (dis/charge, ir measurement, etc) - flashing orange (~ 1hz)
* Action complete (cell inserted, and action has completed) - solid green
	* This should revert to the empty colour/state once the cell is removed.

Note that for all "error" conditions - the device will not proceed until it is rectified.

* Error (under/over voltage) - fast flashing red (~ 2hz)
* Error (any other error) - flashing red (~ 1hz)

--

### Command `chargeComplete`

**Sent to:** server

#### Payload
```javascript
{
	"channel": channel_id,
	"startVoltage": 4200,
	"endVoltage": 3000,
	"startTemperature": 25,
	"endTemperature": 35,
	"capacity": 2500,
	"dcResistance": 60 | null,
	"acResistance": 20 | null,
	"data": [
		{
			"time": 1608127015,
			"voltage": 3500,
			"current": 1900,
			"capacity": 300,
			"temperature": 24
		}
	]
}
```

#### Notes

* Memory constrained devices may not be able to store a lot of data. A typical device **should** report data in 1-10 second sections but longer times are acceptable.
* `channel` channel that completed a charge session.
* `startVoltage` voltage of the cell when charging commenced in mV.
* `endVoltage` voltage of the cell when charging completed in mV.
* `startTemperature` temperature of the cell when charging started in degrees Celsius.
* `endTemperature` temperature of the cell when charging completed in degrees Celsius.
* `capacity` capacity of the cell when charging completed in mAh.
* `dcResistance` and `acResistance` is the internal resistance of the cell in milli Ohms. Set to `null` if not available.
* Data objects:
	* `time` seconds of time that have elapsed since the charge started.
 	* `voltage` voltage of the cell at this time in mV.
 	* `current` current of the cell at this time in mA.
 	* `capacity` total capacity of the cell at this time in mAh.
 	* `temperature` temperature of the cell at this time in degrees Celsius.

--

### Command `dischargeComplete`

**Sent to:** server

#### Payload
```javascript
{
	"channel": channel_id,
	"startVoltage": 4200,
	"endVoltage": 3000,
	"startTemperature": 25,
	"endTemperature": 35,
	"dcResistance": 60 | null,
	"acResistance": 20 | null,
	"capacity": 2500,
	"data": [
		{
			"time": 1608127015,
			"voltage": 3500,
			"current": 1900,
			"capacity": 300,
			"temperature": 24
		}
	]
}
```

#### Notes

* Memory constrained devices may not be able to store a lot of data. A typical device **should** report data in 1-10 second sections but longer times are acceptable.
* `channel` channel that completed a discharge session.
* `startVoltage` voltage of the cell when discharging commenced in mV.
* `endVoltage` voltage of the cell when discharging completed in mV.
* `endTemperature` temperature of the cell when discharging completed in degrees Celsius.
* `startTemperature` temperature of the cell when charging started in degrees Celsius.
* `dcResistance` and `acResistance` is the internal resistance of the cell in milli Ohms. Set to `null` if not available.
* `capacity` capacity of the cell when discharging completed in mAh.
* Data objects (mainly used for generating graphs, **may** be an empty array):
	* `time` seconds of time that have elapsed since the discharge started.
 	* `voltage` voltage of the cell at this time in mV.
 	* `current` current of the cell at this time in mA.
 	* `capacity` total capacity of the cell at this time in mAh.
 	* `temperature` temperature of the cell at this time in degrees Celsius.

--

### Command `resistanceComplete`

**Sent to:** server

#### Payload
```javascript
{
	"channel": channel_id,
	"dcResistance": 60 | null,
	"acResistance": 20 | null,
}
```

#### Notes
* `channel` channel that completed a discharge session.
* `dcResistance` and `acResistance` is the internal resistance of the cell in milli Ohms. Set to `null` if not available.
* A device **may** not implement this.

--

### Command `startAction`

**Sent to:** device

#### Payload

```javascript
{
	"channel": id_of_channel,
	"action": "charge" | "discharge" | "dcResistance" | "acResistance",
	"rate": 1900 | null,
	"cutoffVoltage": 4200 | null
}
```

#### Notes
* Requests that a specified action is started on the specified channel. The device **should** ignore it and respond with a `reportMessage` packet if it is not implemented on the device.
* `rate` the rate of charge/discharge in mA. This value will be `null` if the device reported it's not implemented.
* `cutoffVoltage` the voltage (in mV) at which the device should stop charging/discharging. This value will be set to `null` if the device reported it's not implemented.
* A device **may** ignore this command if it doesn't want to implement it.

--

### Command `stopAction`

**Sent to:** device

#### Payload

```javascript
{
	"channel": id_of_channel
}
```

#### Notes
* Requests that an action is stopped on the specified channel. The device **should** ignore it and respond with a `reportMessage` packet if there isn't an active action.
* A device **may** ignore this command if it doesn't want to implement it.

--

### Command `locateChannel`

**Sent to:** device

#### Payload

```javascript
{
	"channel": id_of_channel
}
```

#### Notes
* Performs a locate channel request. A typical implementation may be flashing the channel's status LED or similar.
* A device **may** ignore this command if it doesn't have a reasonable way of implementing it.

--

### Command `reportLocateChannel`

**Sent to:** device

#### Payload


```javascript
{
	"channel": id_of_channel
}
```

#### Notes
* Reports that the device has started locating a channel. A typical implementation may be flashing the channel's status LED or similar.
* This could be used for many reasons such as calibrating a per channel sensor, etc. and is purely for display reasons on the UI. This can be used in combination with a `reportMessage` packet to guide a user through a process.

--

### Command `reportMessage`

**Sent to:** device

#### Payload

```javascript
{
	"type": "error" | "warning" | "info",
	"message": "descriptive_error_or_warning_or_info_message"
}
```

#### Notes
* A kCharge backend server may log any reported message but it **should** display it on the UI immediately upon receiving it.
* The UI **should** show red for an error, yellow for a warning and the primary colour for an info message.
* The message length **should** be less than 50 characters. However, messages up to 250 characters **may** be sent. This restriction is mainly for display purposes.

--

### Command `resetDevice`

**Sent to:** device

#### Payload

```javascript
{
	"type": "powerCycle" | "factoryReset"
}
```

#### Notes
* Upon receipt of this packet, the device should perform either a power cycle or a full factory reset (ie resetting a configured name, sensor calibration data, etc.)
* A device **may** choose to not implement this.

--

### Command `setConfiguration`

**Sent to:** device

#### Payload

```javascript
{
	"configuration": {}
}
```

#### Notes
* Upon receipt of this packet, the device should replace it's internal configuration data with the new object.
* A device **may** choose to reboot and/or cancel any active actions.
* A device **may** choose to not implement this.
