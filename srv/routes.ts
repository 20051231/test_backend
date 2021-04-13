
import {
    Auth,
    Get,
    Optional,
    Post,
    Patch,
    Delete,
    RouteList,
    Validate,
    Public,
    ItemType,
    RouteRequest,
    toJSON,
    convertType,
    getUniqueString,
} from './utils'

import {
    signJwt,
    User,
    userDB,
} from './auth'

import bcrypt from 'bcrypt'

class Hello {
    @Validate
    @Optional
    msg! : string
}

class LoginRequest {
    @Validate
    email! : string

    @Validate
    password! : string
}

class GetUserRequest {
    @Validate
    userId! : string
}

class PostRequest {
    @Validate
    postId! : string
}

class PostContentRequest {
    @Validate
    content! : string
}

class ForumPost {
    @Validate
    postId! : string

    // TODO: Task 3 Part 1:
    @Validate
    @ItemType(User)
    author! : User

    @Validate
    content! : string

    @Validate
    createdAt! : Date

    @Validate
    updatedAt! : Date

    // End of Task 3 Part 1
}

const posts : {
    [key : string] : ForumPost
} = {};

const saltRounds: number = 10;

export default class Routes extends RouteList {
    @Get
    async foo(req : RouteRequest) {
        return { msg: 'bar' }
    }

    @Post
    async hello(req : RouteRequest, body : Hello) {
        if(body.msg === 'world') {
            return { msg: 'ok' }
        } else {
            return { msg: 'error' }
        }
    }

    // TODO: Task 1 Part 2:

    @Post
    async register(req : RouteRequest, user : User) {
        if (userDB[user.email]) {
            throw new Error("Email already registered")
        }
        user.password = bcrypt.hashSync(user.password, saltRounds);
        userDB[user.email] = user;
        return {
            accessToken: signJwt(user.email)
        }
    }

    // End of Task 1 Part 2

    // TODO: Task 2:

    @Post
    async login(req : RouteRequest, request : LoginRequest) {
        const user : User = userDB[request.email];
        if (!user) {
            throw new Error("Email not registered")
        }

        if (!bcrypt.compareSync(request.password, user.password)) {
            throw new Error("Password does not match")
        }

        return {
            accessToken: signJwt(request.email)
        }
    }

    // End of Task 2

    @Get
    @Auth
    async me(req : RouteRequest) {
        return toJSON(req.user, User, "private");
    }

    @Get("/users/:userId")
    async users(req : RouteRequest, params : GetUserRequest) {
        return toJSON(userDB[params.userId], User, "public");
    }
    
    // TODO: Task 3:

    // Task 3 Part 1: List All Posts
    @Get
    async posts(req : RouteRequest) {
        const postArray : ForumPost[] = Object.values(posts).sort((a, b) => {
            if (a.updatedAt < b.updatedAt) {
                return 1;
            }
            if (a.updatedAt > b.updatedAt) {
                return -1;
            }
            return 0;
        });
        return convertType(postArray, Array, ForumPost, undefined, undefined, "public");
    }

    // Task 3 Part 2: Create a post associated with current user
    @Post("/posts")
    @Auth
    async createPost(req : RouteRequest, request : PostContentRequest) {
        if (!req.user) {
            throw new Error("Login needed")
        }

        const postId : string = getUniqueString();
        const currentTime : Date = new Date();
        const post : ForumPost = {
            postId: postId,
            author: req.user,
            content: request.content,
            createdAt: currentTime,
            updatedAt: currentTime,
        }
        posts[postId] = post

        return toJSON(post, ForumPost, "public");
    }

    // Task 3 Part 3: Update a post
    @Patch("/posts/:postId")
    @Auth
    async patchPost(req : RouteRequest, body : PostContentRequest, params : PostRequest) {
        if (!req.user) {
            throw new Error("Login needed")
        }

        const post : ForumPost = posts[params.postId];
        if (!post) {
            throw new Error("Post not found")
        }

        if (req.user.email !== post.author.email) {
            throw new Error("Only author can update post")
        }

        post.content = body.content;
        post.updatedAt = new Date();

        return toJSON(post, ForumPost, "public");
    }

    // Delete a post
    @Delete("/posts/:postId")
    @Auth
    async deletePost(req : RouteRequest, params : PostRequest) {
        if (!req.user) {
            throw new Error("Login needed")
        }

        const post : ForumPost = posts[params.postId];
        if (!post) {
            throw new Error("Post not found")
        }

        if (req.user.email !== post.author.email) {
            throw new Error("Only author can delete post")
        }

        delete posts[post.postId]

        return { message: `post (ID: ${post.postId}) deleted` }
    }

    // End of Task 3

    
}

