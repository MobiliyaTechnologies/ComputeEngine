/**
 * For Jetson Node server code
 */
var config = {};

config.port = 5001;
config.name = "ComputeEngine";
config.deviceType = "Jetson-TX2";
config.cameraSupported = 3;
config.location = "<Location>";
config.wayToCommunicate = "rsync";
config.pingInterval = 360000;
config.IP = "IP of Jetson if multiple CE on one machine";
config.appendMac = "Compute";

/**
 * IOT hub configuration
 */
config.iotHub = {
    connectionString: '<IoTHubConnectionString>'
};

/**
 * Backend configuration
 */
config.host = '<backendUrl>'

config.user = "/home/<username>/";
/**
 * Blob configurations
 */
config.blobConfiguration ={
    containerName : 'mobileimg',
    account: '<storageAccountName>',
    accessKey: '<storageAccountAccessKey>'
}

config.blobConfiguration.baseUrl = 'https://'+ config.blobConfiguration.account +'.blob.core.windows.net/'


config.resultsFolder = config.user + "Desktop/images"

//_________________________Configuration Done _____________________________________

config.detectionAlgorithms = [{
    "featureName": "humanDetection",
    "fps": 1,
    "shapeSupported": [1]
}, {
    "featureName": "objectDetection",
    "fps": 1,
    "shapeSupported": [1],
    "objectSupported": ["person", "bicycle", "car", "motorbike", "aeroplane", "bus", "train", "truck", "boat", "trafficlight", "firehydrant", "stopsign", "parkingmeter", "bench", "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe", "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard", "sportsball", "kite", "baseballbat", "baseballglove", "skateboard", "surfboard", "tennisracket", "bottle", "wineglass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich", "orange", "broccoli", "carrot", "hotdog", "pizza", "donut", "cake", "chair", "sofa", "pottedplant", "bed", "diningtable", "toilet", "tvmonitor", "laptop", "mouse", "remote", "keyboard", "cellphone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase", "scissors", "teddybear", "hairdrier", "toothbrush"]
}];

//Backend URLs
config.sendDetectionResultUrl = "http://localhost:" + config.port  + "/getresult";
config.JetsonRegistrationURL = config.host + "/devices/computeengines";
config.registerAlgorithm = config.host + "/devices/computeengines/algorithm";

//Folder paths
config.jetsondlFolderPath = '/home/nvidia/ComputeEngine/';
config.CamerasFolderPath = 'darknet/Cameras';
config.camFolder = config.jetsondlFolderPath + config.CamerasFolderPath;
config.livestreamingCamFolder = config.camFolder + '/Cam';

config.DLmodel = config.jetsondlFolderPath + 'darknet/';
config.stopCamera = './stopCamera.py';
config.jetsonImagePath = "nvidia@"+config.IP+":/home/nvidia/ComputeEngine/darknet/Cameras/Cam";

config.darknetDetectArg = 'detect';
config.darknetDetectorArg = 'detector';
config.darknetCfgArg = 'cfg/yolo.cfg';
config.darknetWeightFile = 'yolo.weights';
config.darknetThreshold = '0.35';
config.darknetHierThreshold = '0.5';
module.exports = config;






