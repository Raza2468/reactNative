var PORT = process.env.PORT || 3001;
var ServerSecretKey = process.env.SECRET || "123";
var POSTSECRET = process.env.POSTSECRET || "1231321";
var dbURI = process.env.dbURI || "mongodb+srv://faiz:2468@mundodb.lkd4g.mongodb.net/ttest?retryWrites=true&w=majority"



module.exports = {
    PORT : PORT,
    ServerSecretKey : ServerSecretKey,
    POSTSECRET : POSTSECRET,
    dbURI : dbURI,
}