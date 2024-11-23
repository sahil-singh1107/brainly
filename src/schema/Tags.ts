import mongoose, { Schema, Document } from "mongoose";

// Define the interface for the Tag document
export interface ITag extends Document {
    title: string; // The title of the tag
}

// Define the schema for the Tag model
const tagsSchema = new Schema<ITag>({
    title: { type: String, required: true, unique: true, trim: true }, // Ensure title is unique and trimmed
});

// Create the Tag model
const Tag = mongoose.model<ITag>("Tag", tagsSchema);

export default Tag;
