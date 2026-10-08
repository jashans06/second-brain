import mongoose, {model, Schema} from "mongoose";
import './config.js';

export const connectDatabase = async () => {
    const mongoUrl = process.env.MONGO_URL;
    if (!mongoUrl) {
        throw new Error("MONGO_URL is not defined");
    }

    await mongoose.connect(mongoUrl);
    console.log(`Connected to MongoDB database "${mongoose.connection.name}"`);
};

const UserSchema = new Schema({
    username: {type: String, unique: true},
    password: String
})

export const UserModel = model("User", UserSchema);

const ContentSchema = new Schema({
    title: {type: String, required: true},
    link: {type: String, required: true},
    tags: [{type: mongoose.Types.ObjectId, ref: 'Tag'}],
    type: {type: String, enum: ["youtube", "twitter"], required: true},
    userId: {type: mongoose.Types.ObjectId, ref: 'User', required: true },
})

const LinkSchema = new Schema({
    hash: String,
    userId: {type: mongoose.Types.ObjectId, ref: 'User', required: true, unique: true },
})

export const LinkModel = model("Links", LinkSchema);
export const ContentModel = model("Content", ContentSchema);