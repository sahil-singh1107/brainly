import mongoose, { Types } from "mongoose";
import Tag from "./Tags"
import User from "./Users"
const Schema = mongoose.Schema

const contentType = ["image", "video", "audio", "article"];

const contentSchema = new Schema({
    link: {type: String, require: true},
    linkType: {type: String, enum: contentType, require: true},
    title: {type: String, require: true},
    tags: [{type: Types.ObjectId, ref: "Tag"}],
    userId: {type: Types.ObjectId, ref: "User"}
})

const contentModel = mongoose.model("Content", contentSchema);
export default contentModel