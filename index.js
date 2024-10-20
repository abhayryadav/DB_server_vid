const express = require("express");
const cors = require("cors")
const multer = require("multer")
const { v4: uuidv4 } = require("uuid");
const fs = require("fs")
const path = require("path");
const {exec} = require("child_process") /// study more 
const os = require("os");





function getLocalIP() {
    const ifaces = os.networkInterfaces();
    for (const iface in ifaces) {
        for (const address of ifaces[iface]) {
            if (address.family === 'IPv4' && !address.internal) {
                return address.address;
            }
        }
    }
    return 'localhost'; // Fallback
}








// const destinationCallback = (req, file, callback) => {
//     callback(null, "./uploads");  // Save the file to the 'uploads' folder
// };

// // Callback to define the filename of the uploaded file
// const filenameCallback = (req, file, callback) => {
//     const uniqueSuffix = uuidv4();  // Generate a unique ID
//     const extension = path.extname(file.originalname);  // Get the file extension
//     const newFilename = `${file.fieldname}-${uniqueSuffix}${extension}`;  // Construct the new filename
//     callback(null, newFilename);
// };

// // Using the external callbacks in multer configuration
// const storage = multer.diskStorage({
//     destination: destinationCallback,
//     filename: filenameCallback
// });






//multer middleware
const storage = multer.diskStorage({
    destination: function(req,res,callback){
        if (!fs.existsSync("./uploads")) {
            fs.mkdirSync("./uploads", { recursive: true });
        }
        callback(null,"./uploads")
    },
    filename: function(req,file,callback){
        callback(null,file.fieldname + "-"+ uuidv4() + path.extname(file.originalname))
    }
})
// multer configuration
const upload = multer({storage: storage})


const app = express()
app.use(cors({
    origin:["http://localhost:3000"],
    credentials:true,
}))

app.use((req,res,next)=>{
    res.header("Access-Control-Allow-Origin")
    next()
})
app.use(express.json())
app.use(express.urlencoded({extended:true}))
app.use("/uploads",express.static("uploads"))





app.get("/",(req,res)=>{
    res.json({message: 'hi'})
})




app.post("/uploads",upload.single('file'),(req,res)=>{
    if (!req.file) {
        console.log("No file selected")
        return res.status(400).json({ message: "No file selected" });
    }
    const expid = uuidv4();
    const vidpath = req.file.path
    console.log("vidpath",vidpath)
    const outpath = `./uploads/experiments/${expid}`
    const hlspath = `${outpath}/index.m3u8`
    console.log("hlspath",hlspath)

    if(!fs.existsSync(outpath)){
        fs.mkdirSync(outpath,{recursive:true})
    }





    //ffmpeg
    const ffmpegCommand = `ffmpeg -i ${vidpath} -codec:v libx264 -codec:a aac -hls_time 10 -hls_playlist_type vod -hls_segment_filename "${outpath}/segment%03d.ts" -start_number 0 ${hlspath}`;
    // no queue as it is only poc
    exec(ffmpegCommand,(error,stdout,stderr)=>{
        if(error){
            console.log(`exec error: ${error}`)
        }
        console.log(`exec stdout: ${stdout}`)
        console.log(`exec stderr: ${stderr}`)
        const localIP = getLocalIP(); // Get local IP
        const videoUrl = `http://${localIP}:4000/uploads/experiments/${expid}/index.m3u8`;
        res.json({
            message: "vid converted to HLS format",
            videoUrl:videoUrl,
            ExpId:expid
        })
    })
})



app.listen(4000,()=>{
    console.log("server is listening at http://localhost:4000");
});



