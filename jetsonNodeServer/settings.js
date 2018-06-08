/**
 * For Jetson Node server code
 * Modify config.name, config.location, config.iotHub, config.host, config.macID(any random), 
 */
var config = {};

config.port = 5001;
config.name = "JetsonComputeEngine";
config.deviceType = "Jetson-TX2";
config.cameraSupported = 3;
config.location = "<Location>";
config.wayToCommunicate = "rsync";
config.pingInterval = 900000;
config.macID = "DE:MO:KI:TI";

/**
 * IOT hub configuration
 */
config.iotHub = {
    connectionString: '<IOTHubConnectionString'
};

/**
 * Backend configuration
 */
config.host = "<backendURL>";	      

//Folder path to store input images
config.jetsonImagePath = "NOFolderPathNeededForDemokit";
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

config.sendDetectionResultUrl = config.host + "/results";
config.JetsonRegistrationURL = config.host + "/devices/computeengines";
config.registerAlgorithm = config.host + "/devices/computeengines/algorithm";
config.jetsondlFolderPath = '/home/nvidia/ComputeEngine/';
config.CamerasFolderPath = 'darknet/Cameras';
config.camFolder = config.jetsondlFolderPath + config.CamerasFolderPath;
config.livestreamingCamFolder = config.camFolder + '/Cam';

/**
 * Path to DL model binary file
 */
config.DLmodel = config.jetsondlFolderPath + 'darknet/';

config.darknetDetectArg = 'detect';
config.darknetDetectorArg = 'detector';
config.darknetCfgArg = 'cfg/yolo.cfg';
config.darknetWeightFile = 'yolo.weights';
config.darknetThreshold = '0.35';
config.darknetHierThreshold = '0.5';
module.exports = config;






