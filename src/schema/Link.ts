import mongoose from "mongoose";
import User from "./Users"
const Schema = mongoose.Schema

const linkSchema = new Schema({
    hash: {type: String, require: true},
    userId: {type: mongoose.Schema.Types.ObjectId, ref: "User", require: true}
})

const linkModel = mongoose.model("Link", linkSchema);
export default linkModel;