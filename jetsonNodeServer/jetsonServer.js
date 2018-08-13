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
var deviceConnectionString;
var clientFromConnectionStringAMQP = require('azure-iot-device-amqp').clientFromConnectionString;

var cameraPID = [];
var blobCountMap = new Map();
var toggleSendImageMap = new Map();

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
    var macId = value + config.appendMac;
    var jetsonDetails = {
        "name": config.name,
        "deviceType": config.deviceType,
        "macId": macId,
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
                        deviceConnectionString = config.iotHub.connectionString.split(';')[0] + ";DeviceId=" + deviceInfo.deviceId + ";SharedAccessKey=" + deviceInfo.authentication.symmetricKey.primaryKey;
                        console.log(deviceConnectionString);
                        iotHubClient = clientFromConnectionStringAMQP(deviceConnectionString);
                        messageHandling(deviceConnectionString);
                    });
                }

                if (res) console.log(' status: ' + res.statusCode + ' ' + res.statusMessage);
                if (deviceInfo) {
                    deviceConnectionString = config.iotHub.connectionString.split(';')[0] + ";DeviceId=" + deviceInfo.deviceId + ";SharedAccessKey=" + deviceInfo.authentication.symmetricKey.primaryKey;
                    console.log(deviceConnectionString);
                    //              iotHubClient = hubClient.fromConnectionString(deviceConnectionString, Protocol);
                    iotHubClient = clientFromConnectionStringAMQP(deviceConnectionString);

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
            /**
             * Stop/Start sending images to backend for a specific camera
             */
            case "toggleSendImageFlag":
                var toggleData = JSON.parse(message.toString());
                if (toggleData.flag === 0 || toggleData.flag === 1) {
                    toggleSendImageMap.set(toggleData.camId, toggleData.flag);
                } else {
                    console.log("Error in ToggleSendImageFlag :: Invalid flag");
                }
                break;

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
        else {
            console.log("Base Directory created successfully!");
            //watchFunction();
        }
    });
}

//_________________________Functions_________________________
/**
 * Spawning the model 
 */
var spawnDLModel = function (camId, message, isLinePresent, isAnotherBox) {
    console.log("_______________________________Compute Engine Darknet OUTPUT______________________________________");

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

        child.stderr.on('data', (data) => {
            console.log(`stderr: ${data}`);
        });

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
    var detection_type_str = parsedJson.feature;
    var bbox = parsedJson.boundingBox;
    var isLinePresent = false;
    var isAnotherBox = false;

    blobCountMap.set(camId, 1);

    bbox.forEach(function (box) {
        if (box.shape == 'Line')
            isLinePresent = true;
        else
            isAnotherBox = true;
    });
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
            toggleSendImageMap.delete(camId);
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

//________________DEMO code ________________
const storage = require('azure-storage');
var Message = require('azure-iot-common').Message;
var fs = require('fs');
var watch = require('node-watch');
var blobService = storage.createBlobService(config.blobConfiguration.account, config.blobConfiguration.accessKey);
var darknetImages = "threeblobcontainer"; //ContainerName
var imageResult = new Map();

const createContainer = function (containerName, callback) {
    blobService.createContainerIfNotExists(containerName, { publicAccessLevel: 'container' }, function (err) {
        if (err) {
            console.log("Error in creating blob -", err);
        } else {
            console.log("Created container - ", containerName);
            callback(null);
        }
    });
}

createContainer(darknetImages, function () {
    console.log("container created")
});

app.post('/getresult', function (req, res) {
    res.end();
    //var imageData = JSON.stringify(req.body.imageName)
    updateResult(req);
});

var updateResult = function (req) {
    var imageData = req.body;
    var imgArray = imageData.imageName.split('/');
    var imageNameLocal = imgArray[imgArray.length - 1];
    var imgFull = imageData.imageName;
    //Check if blob uploaded
    var imageUrl = imageResult.get(imageNameLocal);

    if (imageUrl) {
        imageResult.delete(imageNameLocal);
        imageData.imageName = imageNameLocal;
        imageData.imageUrl = imageUrl;
        //console.log("Result sending --", imageUrl);
        var message = new Message(JSON.stringify(imageData));
        if (message) {
            sendResultHub(message, imgFull);
        } else {
            //console.log("\n\nSkipped by uploadBlob..No result");
        }
    } else {
        //console.log("\n\nSkipped by updateresult");
        imageData.imageName = imageNameLocal;
        imageResult.set(imageNameLocal, imageData);
    }
}

/**
 * Watch the folder to upload images
 */
watch(config.jetsondlFolderPath + '/darknet/Cameras', { recursive: true }, function (evt, name) {
    if (evt == 'update') {
        //console.log('%s changed.', name);
        uplaodToBlob(name);
    }
});

//upload image to blob
var uplaodToBlob = function (name) {
    var startUpload = new Date().getTime();
    var imgArray = name.split('/');
    var imageName = imgArray[imgArray.length - 1];
    var blobName;
    var camId = imageName.split("_")[0];

    var blobCount = blobCountMap.get(camId);

    //send images only if asked
    if (toggleSendImageMap.get(camId)) {
        if (blobCount === 1) {
            blobName = "blobOne" + camId;
            blobCountMap.set(camId, 2);
        }
        else if (blobCount === 2) {
            blobName = "blobTwo" + camId;
            blobCountMap.set(camId, 3);
        }
        else if (blobCount === 3) {
            blobName = "blobThree" + camId;
            blobCountMap.set(camId, 1);
        }

        //blobName = imageName.split('.')[0];   //use if multiple blobs -multiple images
        var imageUrl = config.blobConfiguration.baseUrl + darknetImages + "/" + blobName;

        blobService.createBlockBlobFromLocalFile(darknetImages, blobName, name,
            function (error, result, response) {
                if (!error) {
                    //console.log("Blob upload Success - VideoUrl", imageUrl);
                    // console.log("Uploading required -------" + imageUrl + "-------->", new Date().getTime() - startUpload);//console.log(blobName);
                    var imageData = imageResult.get(imageName);

                    if (imageData) {
                        imageResult.delete(imageName);
                        //console.log("UploadBlob Sending -- ",imageUrl);
                        imageData.imageUrl = imageUrl;
                        var message = new Message(JSON.stringify(imageData));
                        sendResultHub(message, name);
                    } else {
                        imageResult.set(imageName, imageUrl);
                        //console.log("\n\nSkipped by uploadBlob..No result");
                    }
                } else {
                    console.log("Couldnt upload video to azure blob\n", error);
                }
            });
    } else {
	//console.log("Not sending images - flag not toggled");
        imageResult.set(imageName, "FlagNotToggled");
    }
}

var countMsg =1;

//send messaeg to IOTHub - result
var sendResultHub = function (message, name) {
    var startUpload = new Date().getTime();
    message.ack = 'full';
    message.messageId = "stopCamera";
    //message.contentType = "application/json";
    //console.log(message);

    iotHubClient.sendEvent(message, function (err) {
        //console.log(err);
        fs.unlink(name, function () { });   //delete image
        //console.log(imageUrl);
        countMsg=countMsg+1;

        if(countMsg>100){
            countMsg=1
            console.log("Sent===========================");
        }});
}
//Use these options to upload blob if data more than 
var uploadOptions = {
    //          storeBlobContentMD5: true,
    parallelOperationThreadCount: 5,
    blockSize: 1024,
    //        useTransactionalMD5: true
};
