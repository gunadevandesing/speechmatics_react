export function getJwt() {
  return fetch(`https://mp.speechmatics.com/v1/api_keys?type=rt`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${import.meta.env.VITE_SM_KEY}`,
    },
    body: JSON.stringify({ ttl: 3600 }),
  })
    .then((res) => res.json())
    .then((data) => data.key_value);
}
