const { Pinecone } = require("@pinecone-database/pinecone");

const pc = new Pinecone({ apiKey: process.env.PINECONE_API_KEY });
const aiChatBotIndex = pc.index(
  process.env.PINECONE_INDEX_NAME,
  process.env.PINECONE_HOST_NAME,
);

const createMemory = async ({ vectors, metadata, messageId }) => {
  if (!vectors || !Array.isArray(vectors) || vectors.length !== 768) {
    throw new Error("Cannot upsert empty or invalid vectors");
  }
  console.log(
    "Upserting memory with messageId in VectorDB(pinecone):",
    messageId,
  );
  const records = [
    {
      id: String(messageId),
      values: vectors,
      metadata,
    },
  ];
  // console.log("Upserting record to Pinecone:", records.length);
  await aiChatBotIndex.namespace("default").upsert({ records });

  console.log(
    `✅ Memory stored Successfully for messageId VectorDB(pinecone): ${messageId}`,
  );
};

const queryMemory = async ({ queryVector, limit = 3, metadata }) => {
  if (
    !queryVector ||
    !Array.isArray(queryVector) ||
    queryVector.length !== 768
  ) {
    throw new Error("Query vector is invalid");
  }

  const response = await aiChatBotIndex.namespace("default").query({
    vector: queryVector,
    topK: limit,
    filter: metadata || undefined,
    includeValues: false,
    includeMetadata: true,
  });

  return response.matches;
};

module.exports = { createMemory, queryMemory };
