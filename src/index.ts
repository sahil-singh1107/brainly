import express, { NextFunction } from "express"
import { Request, Response } from "express";
import connectDB from "./config/db"
import { string, z } from "zod";
import User from "./schema/Users"
import Tag from "./schema/Tags"
import Content from "./schema/Content"
import bcrypt from "bcrypt"
import dotenv from "dotenv";
import hash from "object-hash"
import Link from "./schema/Link"
import jwt, { JwtPayload } from "jsonwebtoken"
import cors from "cors"

dotenv.config();
const PORT = process.env.PORT || 5000

const app = express();
app.use(express.json())
app.use(cors())

const userSchema = z.object({
    username: z.string().min(3).max(100),
    password: z.string().min(8)
})

const contentSchema = z.object({
    token: z.string().min(1),
    link: z.string().min(1),
    linkType: z.string().min(1),
    title: z.string().min(1),
    tags: z.array(z.string()),
})

type UserInput = z.infer<typeof userSchema>

interface ContentRequest extends Request {
    userId?: string
}


function middleware(req: Request, res: Response, next: NextFunction) {
    const token = req.body.token;
    jwt.verify(token, 'sadsfvdfbv34y', function (err: any, decoded: any) {
        if (err) {
            console.log(err);
            res.status(500).json({ message: "Invalid token" })
        }
        else {
            (req as ContentRequest).userId = decoded.id;
            next();
        }
    });
}



app.post("/api/v1/signup", async (req: Request, res: Response) => {
    const parsedResult = userSchema.safeParse(req.body);
    if (parsedResult.success) {
        const userInput: UserInput = parsedResult.data
        bcrypt.hash(userInput.password, 10, async function (err, hash) {
            try {
                let user = await User.findOne({ username: userInput.username })
                if (user) {
                    res.status(400).json({ message: "User already exists" })
                    return;
                }
                await User.create({ username: userInput.username, password: hash })
                res.status(200).json({ message: "User created successfully" })
                return;
            } catch (error) {
                console.log(error);
                res.status(500);
                return;
            }
        });
    }
    else {
        // @ts-ignore
        res.status(400).json({ message: parsedResult.error.errors[0].message });
        return;
    }
})

app.post("/api/v1/signin", async (req, res) => {
    const parsedResult = userSchema.safeParse(req.body);
    if (parsedResult.success) {
        const userInput: UserInput = parsedResult.data
        const user = await User.findOne({ username: userInput.username })
        if (!user) {
            res.status(400).json({ message: "user doesnt exist" })
            return;
        }
        bcrypt.compare(userInput.password, user.password!, function (err, result) {
            if (result) {
                const token = jwt.sign({ id: user._id }, "sadsfvdfbv34y");
                res.json(token)
                return;
            }
            else {
                res.status(400).json({ message: "wrong password" })
                return;
            }
        });
    }
    else {
        res.status(400).json({ message: parsedResult.error.errors[0].message });
        return;
    }
})

app.post("/api/v1/content", middleware, async (req, res) => {
    const contentReq = req as ContentRequest;
    const userId = contentReq.userId;

    const parsedResult = contentSchema.safeParse(req.body);

    if (parsedResult.success) {
        const { link, linkType, title, tags } = req.body

        const tagIds = [];

        for (const tagTitle of tags) {
            let tag = await Tag.findOne({ title: tagTitle });
            if (!tag) {
                tag = await Tag.create({ title: tagTitle });
            }
            tagIds.push(tag._id);
        }

        await Content.create({ link, linkType, title, tags: tagIds, userId });

        res.status(200).json({ message: "Content created" });

    }
    else {
        res.status(400).json({ message: parsedResult.error.errors[0].message });
        return;
    }
})

app.post("/api/v1/getcontent", middleware, async (req, res) => {
    const contentReq = req as ContentRequest;
    const userId = contentReq.userId;
    try {
        let data = await Content.find({ userId }).populate('tags', "title").populate('userId', "username")
        //console.log(data)
        res.status(200).json({ data });
    } catch (error) {
        res.status(500).json({ error });
    }
})

app.delete("/api/v1/content", middleware, async (req, res) => {
    const contentReq = req as ContentRequest;
    const id = contentReq.userId;
    const { contentId } = req.body;

    try {
        let content = await Content.findOne({ _id: contentId });

        if (!content) {
            res.status(404).json({ message: "Content not found" });
            return;
        }
        // @ts-ignore
        if (content.userId.toString() === id) {

            await Content.deleteOne({ _id: contentId });
            res.status(200).json({ message: "Content deleted" });
            return;
        } else {

            res.status(403).json({ message: "Unauthorized to delete this content" });
            return;
        }
    } catch (error) {
        console.error(error);

        res.status(500).json({ message: "An error occurred while deleting content" });
        return;
    }
})

app.post("/api/v1/brain/share", middleware, async (req, res) => {
    const contentReq = req as ContentRequest;
    const id = contentReq.userId;
    try {
        await Link.create({ hash: hash(id!, { algorithm: "sha1" }), userId: id, mode: req.body.mode })
        res.status(200).json({ message: "link created" })
        return;
    } catch (error) {
        console.log(error);
        res.status(500)
        return;
    }
})

app.get("/api/v1/brain:shareLink", async (req, res) => {
    const hash = req.query.hash;
    const link = await Link.findOne({ hash })
    try {
        if (!link) {
            res.status(404).json({ message: "Link not found" });
            return;
        }
        if (link.mode === 0) {
            res.status(200).json({ message: "Link is private" });
            return;
        }
        const userId = link.userId
        const data = await Content.find({ userId }).populate("tags", "title").populate("userId", "username");
        res.status(200).json({ data });
        return;
    } catch (error) {
        console.error("Error fetching link or content:", error);
        res.status(500).json({ message: "Internal Server Error" });
        return;
    }
})

app.post("/api/v1/tags", middleware, async (req, res) => {
    try {
        let data = await Tag.find({}, { title: 1, _id: 0 });
        res.status(201).json({ data });
        return;
    } catch (error) {
        console.log(error)
        return;
    }
})

app.post("/api/v1/getPosts", middleware, async (req, res) => {
    const { tags } = req.body;
    console.log(tags)
    if (!Array.isArray(tags) || tags.length === 0) {
       res.status(400).json({ error: "Tags must be a non-empty array" });
       return;
    }

    try {
        const tagObjects = await Tag.find({ title: { $in: tags } }).select("_id");
        if (tagObjects.length === 0) {
            res.status(404).json({ error: "No matching tags found" });
            return;
        }
        const tagIds = tagObjects.map((tag) => tag._id);
        const content = await Content.find({ tags: { $in: tagIds } })
            .populate("tags") 
            .populate("userId");

        res.status(200).json({ data: content });
        return;
    } catch (error) {
        console.error("Error fetching posts:", error);
        res.status(500).json({ error: "Failed to fetch posts" });
        return;
    }
});


connectDB().then(() => app.listen(PORT, () => console.log("server up and running"))).catch((err) => console.log(err));