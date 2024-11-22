import mongoose from "mongoose";
const Schema = mongoose.Schema

const tagsSchema = new Schema({
    title: {type: String, require: true}
})

const tagsModel = mongoose.model("Tag", tagsSchema);

export default tagsModel