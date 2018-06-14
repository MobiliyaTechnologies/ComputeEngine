var config = require('./settings');
var app = require('express')();
var bodyParser = require('body-parser');
var fs = require('fs');
var spawn = require('child_process').spawn;
var mkdirp = require('mkdirp');
var serial = require('node-serial-key');
var ip = require("ip");
var request = require("request");
var iothub = require('azure-iothub');
var connectionString = config.iotHub.connectionString;
var registry = iothub.Registry.fromConnectionString(connectionString);
var client;
var clientFromConnectionString = require('azure-iot-device-mqtt').clientFromConnectionString;
var Message = require('azure-iot-device').Message;

var cameraPID = [];

var errors = {
    Runtime: {
        json: {
            code: "ERR00000",
            message: "Runtime Exception Occurred.",
            description: "Runtime Exception Occurred."
        },
        status: 500
    }
};

var errorHandler = function (errName, res) {
    if (errors[errName])
        res.status(errors[errName].status).send(errors[errName].json);
    else {
        var ret = errors["Runtime"].json;
        ret.description = errName;
        res.status(500).send(ret);
    }
};
//_________________________SERVER CONFIGURATION_________________________

app.use(bodyParser.urlencoded({
    extended: true
}));
app.use(bodyParser.json());

app.post('/_ping', function (req, res) {
    res.status(200).send(req.body);
});

app.use(
    function (req, res, next) {
        if (req.method === 'OPTIONS')
            next();
        else {
            console.log("Path not found: " + req.originalUrl);
            res.status(404).send({
                "error": "Page Not Found",
                "message": "Incorrect Collection Passed",
                "description": "Cannot Detect the url"
            });
        }
    }
);

app.listen(config.port, function () {
    console.log('Jetson Server is listening at: ' + config.port);
});

//___________________________Registration done_________________________

//Topic Names
function printResultFor(op) {
    return function printResult(err, res) {
        if (err) console.log(op + ' error: ' + err.toString());
        if (res) console.log(op + ' status: ' + res.constructor.name);
    };
}

//Compute Engine's ping Mechanism

serial.getSerial(function (err, value) {
    console.log("Registering COMPUTE ENGINE on Server..................");
    var jetsonDetails = {
        "name": config.name,
        "deviceType": config.deviceType,
        "macId": ip.address(),
        "ipAddress": ip.address(),
        "detectionAlgoritms": config.detectionAlgoritms,
        "cameraSupported": config.cameraSupported,
        "location": config.location,
        "supportedShapes": config.supportedShapes,
        "jetsonCamFolderLocation": config.jetsonImagePath,
        "wayToCommunicate": config.wayToCommunicate
    };

    var options = {
        rejectUnauthorized: false,
        url: config.JetsonRegistrationURL,
        method: 'POST',
        json: jetsonDetails
    };
    request(options, function (error, response, body) {
        if (error) {
            console.log("Error Message : Error Registering the Compute Engine!");
        }
        else {
            var computeEngineId = response.body._id;

            // Create a new device
            var device = {
                deviceId: computeEngineId
            };

            registry.create(device, function (err, deviceInfo, res) {
                if (err) {
                    console.log(err.toString());
                    registry.get(device.deviceId, function (err, deviceInfo, res) {
                        console.log("Device Already Registered");
                        var deviceConnectionString = config.iotHub.connectionString.split(';')[0] + ";DeviceId=" + deviceInfo.deviceId + ";SharedAccessKey=" + deviceInfo.authentication.symmetricKey.primaryKey;
                        messageHandling(deviceConnectionString);
                    });
                }

                if (res) console.log(' status: ' + res.statusCode + ' ' + res.statusMessage);
                if (deviceInfo) {
                    var deviceConnectionString = config.iotHub.connectionString.split(';')[0] + ";DeviceId=" + deviceInfo.deviceId + ";SharedAccessKey=" + deviceInfo.authentication.symmetricKey.primaryKey;
                    //MQTT Topic subcription call
                    messageHandling(deviceConnectionString);
                }
            });

            /**
             * Algorithm Registration 
            */
            var algorithmDetails = {
                "computeEngineId": computeEngineId,
                "detectionAlgorithms": config.detectionAlgorithms,
            }

            var optionsAlgo = {
                rejectUnauthorized: false,
                url: config.registerAlgorithm,
                method: 'POST',
                json: algorithmDetails

            };

            request(optionsAlgo, function (error, response, body) {
                if (error) {
                    console.log("Error Message : Error Registering the Compute Engine Algorithm!");
                } else {
                    console.log("Success in Registering Algorithm!");
                    pingMechanismInterval(jetsonDetails);
                }
            });
        }
    });
});

var pingMechanismInterval = function (jetsonDetails) {

    setInterval(function () {
        var jsonToPing = jetsonDetails;

        var options = {
            rejectUnauthorized: false,
            url: config.JetsonRegistrationURL,
            method: 'POST',
            json: jsonToPing
        };
        request(options, function (error, response, body) {
            if (error) {
                console.log("\n**PING STATUS -> \n    Error in Ping Interval of the Compute Engine : ", error);
            } else {
                console.log("\n**PING STATUS -> \n    Success in Jetson Ping !");
            }
        });
    }, config.pingInterval);
}

//_________________________SERVER CONFIGURATION DONE_________________________

//Handling Messages
var messageHandling = function (deviceConnectionString) {
    // console.log("In iot hub listener", deviceConnectionString);
    client = clientFromConnectionString(deviceConnectionString);

    client.on('message', function (message) {
        // console.log('Id: ' + message.messageId + ' Body: ' + message.data);
        client.complete(message, printResultFor('completed'));
        var topic = message.messageId;
        var message = message.data;

        switch (topic) {
            case '/':
                {
                    console.log("MQTT==================Project Heimdall Server Available to Respond!!\n-----------------------------------\n");
                    break;
                }
            case "startStreaming":
                {
                    var sendData = message.toString();
                    var parsedJson = JSON.parse(sendData);
                    var camId = parsedJson.camId;
                    var camArr = [];
                    camArr.push(camId);
                    stopCamera(camArr, function (msg) {
                        console.log("Checking if same camera is already spawned! : ", msg);
                        boundingBox(sendData, function (error) {
                            if (!error)
                                console.log("MQTT==================Create configuration files, and spawn DL model Done!!==========================\n");
                            else
                                console.log("Error Message : Error in Starting Process!");
                        });
                    });

                    break;
                }
            case "stopCamera":
                {
                    var camIds = JSON.parse(message.toString());
                    console.log("*STOP this cameras : ", camIds);
                    stopCamera(camIds, function (error, camIds) {
                        if (!error) {
                            console.log("*Camera Stopped : ", camIds);
                        }
                        else {
                            console.log("**Error in stopping cameras : ", camIds);
                            //console.log("**ERROR :: ", error);
                        }
                    });
                    break;
                }

            default:
                {
                    console.log("\n Topic:: " + topic + " not handled!!");
                }
        }
    });

}

/**
 * Creation of base directory for images
 */
if (!fs.existsSync(config.camFolder)) {
    mkdirp(config.camFolder, function (err) {
        if (err) {
            console.log('error in creating folder');
        }
        else
            console.log("Base Directory created successfully!");
    });
}

//_________________________Functions_________________________

/**
 * Spawning the model 
 */
var spawnDLModel = function (camId, message, isLinePresent, isAnotherBox) {
    console.log("_______________________________Compute Engine Darknet OUTPUT______________________________________");

    //ls = exec('cd '+config.DLmodel+' ; ./detectnet-console "'+ config.sendDetectionResultUrl + '" "'+ config.stopProcessingDetectnetDL + '"');

    var darknet_args = config.darknetCfgArg + ' ' + config.darknetWeightFile + ' ' + config.darknetThreshold + ' ' + config.darknetHierThreshold;
    var stopProcessingDetectnetDL = config.stopProcessingDetectnetDL;
    var DLmodel = config.DLmodel;
    var sendDetectionResultUrl = config.sendDetectionResultUrl;
    var livestreamingCamFolder = config.livestreamingCamFolder;
    var darknet_arg_detect = config.darknetDetectArg;
    console.log(darknet_args);


    if (isAnotherBox) {
        const child = spawn('./darknet',
            [darknet_arg_detect, darknet_args, sendDetectionResultUrl, livestreamingCamFolder, message],
            { cwd: DLmodel }
        );
        //cameraId and PID storing
        cameraPID.push({ "cameraId": camId, "pid": child.pid });

        child.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });

        /*child.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`);
          });*/

        child.on('close', (code) => {
            console.log(`child process exited with code ${code}`);
        });
    }

    if (isLinePresent) {
        const lineChild = spawn('./darknet',
            [config.darknetDetectorArg, darknet_args, sendDetectionResultUrl, livestreamingCamFolder, message],
            { cwd: DLmodel }
        );
        cameraPID.push({ "cameraId": camId, "pid": lineChild.pid });
        lineChild.stdout.on('data', (data) => {
            console.log(`stdout: ${data}`);
        });
        lineChild.on('close', (code) => {
            console.log(`line child process exited with code ${code}`);
        });
    }
}

/**
 * to setup processing for camera
 * @param {*string} message 
 * @param {*function} callaback 
 */
var boundingBox = function (message, callback) {

    var parsedJson = JSON.parse(message);
    var camId = parsedJson.camId;
    var streamingUrl = parsedJson.streamingUrl;
    var deviceName = parsedJson.deviceName;
    var boxes = parsedJson.boundingBox;
    var detection_type_str = parsedJson.feature;
    var bbox = parsedJson.boundingBox;
    var isLinePresent = false;
    var isAnotherBox = false;
    bbox.forEach(function (box) {
        if (box.shape == 'Line')
            isLinePresent = true;
        else
            isAnotherBox = true;
    }
    );
    console.log("\n  CamId:::", camId);
    camera_folder = config.livestreamingCamFolder + camId;

    /*if (!fs.existsSync(camera_folder)) 
    {*/
    //create cameraId directory
    mkdirp(camera_folder, function (err) {
        if (err) {
            console.log("Error Message : Error in creating folder ", camera_folder);
        }
        else
            console.log(" Camera Directory created successfully!");
    });
    //}
    var detection_type = "";
    if (detection_type_str == 'humanDetection') {
        detection_type = "0";
    } else {
        detection_type = "1";
    }
    spawnDLModel(camId, message, isLinePresent, isAnotherBox);
    callback(null);
}

/**
 * to stop processing cameras 
 * @param {*string} camIds 
 * @param {*function} callback 
 */
var stopCamera = function (camIds, callback) {

    var camId = camIds[0];

    var tempArr = cameraPID.slice();
    tempArr.forEach(function (cam, i) {

        if (cam.cameraId === camId) {
            console.log("Camera ID Found!");
            try {
                process.kill(cam.pid);
            } catch (e) {
                console.log("Process not found!");
            }
            console.log("The Process is Killed Succesfully!");
            cameraPID.splice(i, i + 1);
            callback(null);
        }
    });
    callback("notFound");
}
