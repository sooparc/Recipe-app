const searchBtn = document.querySelector("#search-btn");

searchBtn.addEventListener("click", async () => {
  const searchInputTxt = document.getElementById("search-input").value.trim();
  const res = await axios.get(`./search/${searchInputTxt}`);
});
