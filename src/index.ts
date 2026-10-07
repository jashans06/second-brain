import express from "express";
import { random } from "./utils.js";
import jwt from "jsonwebtoken";
import { connectDatabase, ContentModel, LinkModel, UserModel } from "./db.js";
import "./config.js";
import { JWT_PASSWORD } from "./config.js";
import { userMiddleware } from "./midlleware.js";
import bcrypt from "bcrypt";
import { z } from "zod";
// import cors from "cors";

const app = express();
app.use(express.json());
// app.use(cors());

const signupSchema = z.object({
    username: z.string().trim().min(3).max(30),
    password: z.string().min(8)
})


app.post("/api/v1/signup", async (req, res) => {
    const result = signupSchema.safeParse(req.body);
    if (!result.success) {
        res.status(400).json({
            message: "Invalid signup details",
            errors: result.error
        });
        return;
    }

    try {
        await UserModel.create({
            username: result.data.username,
            password: await bcrypt.hash(result.data.password, 10)
        });

        res.json({
            message: "User signed up"
        });
    } catch (error) {
            res.status(409).json({
            message: "User already exists"
            });
            throw error;
    }
        
    
});

app.post("/api/v1/signin", async (req, res) => {
    const username = req.body.username;
    const password = req.body.password;

    const user = await UserModel.findOne({
        username
    });

    if (user && typeof password === "string" && typeof user.password === "string" && await bcrypt.compare(password, user.password)) {
        const token = jwt.sign({
            id: user._id.toString()
        }, JWT_PASSWORD);

        res.json({
            token
        });
    } else {
        res.status(403).json({
            message: "Incorrect credentials"
        });
    }
});

app.post("/api/v1/content", userMiddleware, async (req, res) => {
    const userId = req.userId;
    const link = req.body.link;
    const type = req.body.type;
    const title = req.body.title;

    if (!userId) {
        res.status(401).json({
            message: "Unauthorized"
        });
        return;
    }

    await ContentModel.create({
        link,
        type,
        title,
        userId,
        tags: []
    });

    res.json({
        message: "Content added"
    });
})

app.get("/api/v1/content", userMiddleware, async (req, res) => {
    const userId = req.userId;

    if (!userId) {
        res.status(401).json({
            message: "Unauthorized"
        });
        return;
    }

    const content = await ContentModel.find({
        userId
    }).populate("userId", "username");

    res.json({
        content
    });
})

app.delete("/api/v1/content", userMiddleware, async (req, res) => {
    const userId = req.userId;
    const contentId = req.body.contentId;

    if (!userId) {
        res.status(401).json({
            message: "Unauthorized"
        });
        return;
    }

    await ContentModel.deleteMany({
        _id: contentId,
        userId
    });

    res.json({
        message: "Deleted"
    });
})

app.post("/api/v1/brain/share", userMiddleware, async (req, res) => {
    const userId = req.userId;
    const share = req.body.share;

    if (!userId) {
        res.status(401).json({
            message: "Unauthorized"
        });
        return;
    }

    if (share) {
        const existingLink = await LinkModel.findOne({
            userId
        });

        if (existingLink) {
            res.json({
                hash: existingLink.hash
            });
            return;
        }

        const hash = random(10);
        await LinkModel.create({
            userId,
            hash
        });

        res.json({
            hash
        });
    } else {
        await LinkModel.deleteOne({
            userId
        });

        res.json({
            message: "Removed link"
        });
    }
})

app.get("/api/v1/brain/:shareLink", async (req, res) => {
    const hash = req.params.shareLink;

    const link = await LinkModel.findOne({
        hash
    });

    if (!link) {
        res.status(411).json({
            message: "Sorry incorrect input"
        })
        return;
    }
    // userId
    const content = await ContentModel.find({
        userId: link.userId
    })

    console.log(link);
    const user = await UserModel.findOne({
        _id: link.userId
    })

    if (!user) {
        res.status(411).json({
            message: "user not found, error should ideally not happen"
        })
        return;
    }

    res.json({
        username: user.username,
        content: content
    })

})

const startServer = async () => {
    console.log("Connecting to MongoDB...");
    await connectDatabase();
    app.listen(3000, () => {
        console.log("Server listening on port 3000");
    });
};

startServer().catch((error: unknown) => {
    const message = error instanceof Error ? error.message : String(error);
    console.error(`Unable to start the server: ${message}`);
    console.error("Check that MONGO_URL contains valid MongoDB Atlas credentials and that your IP is allowed.");
    process.exitCode = 1;
});
