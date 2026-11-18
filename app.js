const blogListEl = document.getElementById("blog-list");
const paginationEl = document.getElementById("pagination");
const statusEl = document.getElementById("status");
const searchInput = document.getElementById("search-input");
const limitSelect = document.getElementById("limit-select");

// URL'deki parametreleri okuyan yardımcı fonksiyon
function getQueryParams() {
  const params = new URLSearchParams(window.location.search);
  return {
    page: parseInt(params.get("page")) || 1,
    limit: parseInt(params.get("limit")) || 5,
    q: params.get("q") || ""
  };
}

// URL'yi sayfa yenilenmeden güncelleyen fonksiyon
function updateURL(page, limit, q) {
  const url = new URL(window.location);
  url.searchParams.set("page", page);
  url.searchParams.set("limit", limit);

  if (q.trim()) {
    url.searchParams.set("q", q.trim());
  } else {
    url.searchParams.delete("q");
  }

  window.history.pushState({}, "", url);
}

// DummyJSON API'den veriyi çeken ana fonksiyon
async function fetchAndRender() {
  const { page, limit, q } = getQueryParams();

  // Input ve Select değerlerini URL ile senkronize tut
  searchInput.value = q;
  limitSelect.value = limit;

  // API için skip hesabı: (Sayfa - 1) * Limit
  const skip = (page - 1) * limit;

  // Arama varsa /posts/search endpoint'ini, yoksa /posts endpoint'ini kullan
  const endpoint = q
    ? `https://dummyjson.com/posts/search?q=${encodeURIComponent(q)}&limit=${limit}&skip=${skip}`
    : `https://dummyjson.com/posts?limit=${limit}&skip=${skip}`;

  statusEl.textContent = "Yükleniyor...";
  blogListEl.innerHTML = "";
  paginationEl.innerHTML = "";

  try {
    const response = await fetch(endpoint);
    const data = await response.json(); // { posts, total, skip, limit }

    statusEl.textContent = `Toplam ${data.total} yazıdan ${data.skip + 1} - ${Math.min(data.skip + data.limit, data.total)} arası gösteriliyor.`;

    renderPosts(data.posts);
    renderPagination(data.total, limit, page, q);
  } catch (error) {
    statusEl.textContent = "Veriler alınırken bir hata oluştu.";
    console.error(error);
  }
}

// Yazıları DOM'a basan fonksiyon
function renderPosts(posts) {
  blogListEl.innerHTML = "";

  if (posts.length === 0) {
    blogListEl.innerHTML = "<p>Eşleşen yazı bulunamadı.</p>";
    return;
  }

  posts.forEach(post => {
    const postDiv = document.createElement("div");
    postDiv.classList.add("post");

    const titleEl = document.createElement("h2");
    titleEl.textContent = `${post.id}. ${post.title}`;

    const bodyEl = document.createElement("p");
    bodyEl.textContent = post.body;

    const tagsDiv = document.createElement("div");
    tagsDiv.classList.add("tags");
    post.tags.forEach(tag => {
      const tagSpan = document.createElement("span");
      tagSpan.classList.add("tag");
      tagSpan.textContent = `#${tag}`;
      tagsDiv.appendChild(tagSpan);
    });

    postDiv.appendChild(titleEl);
    postDiv.appendChild(bodyEl);
    postDiv.appendChild(tagsDiv);
    blogListEl.appendChild(postDiv);
  });
}

// Sayfalama butonlarını oluşturan fonksiyon (Çok sayfa olduğu için pencereleme mantığı ile)
function renderPagination(total, limit, currentPage, q) {
  paginationEl.innerHTML = "";
  const totalPages = Math.ceil(total / limit);

  if (totalPages <= 1) return;

  // Önceki Butonu
  const prevBtn = document.createElement("button");
  prevBtn.textContent = "Önceki";
  prevBtn.disabled = currentPage === 1;
  prevBtn.addEventListener("click", () => {
    updateURL(currentPage - 1, limit, q);
    fetchAndRender();
  });
  paginationEl.appendChild(prevBtn);

  // 251 veri olduğu için 50 sayfa butonu yan yana dizilmesin diye mevcut sayfanın etrafındaki 2 sayfayı gösterir
  const startPage = Math.max(1, currentPage - 2);
  const endPage = Math.min(totalPages, currentPage + 2);

  for (let i = startPage; i <= endPage; i++) {
    const pageBtn = document.createElement("button");
    pageBtn.textContent = i;
    if (i === currentPage) {
      pageBtn.classList.add("active");
    }
    pageBtn.addEventListener("click", () => {
      updateURL(i, limit, q);
      fetchAndRender();
    });
    paginationEl.appendChild(pageBtn);
  }

  // Sonraki Butonu
  const nextBtn = document.createElement("button");
  nextBtn.textContent = "Sonraki";
  nextBtn.disabled = currentPage === totalPages;
  nextBtn.addEventListener("click", () => {
    updateURL(currentPage + 1, limit, q);
    fetchAndRender();
  });
  paginationEl.appendChild(nextBtn);
}

// Arama inputu dinleyicisi (Debounce ile API'yi yormamak için)
let debounceTimer;
searchInput.addEventListener("input", (e) => {
  clearTimeout(debounceTimer);
  debounceTimer = setTimeout(() => {
    const { limit } = getQueryParams();
    updateURL(1, limit, e.target.value); // Yeni aramada 1. sayfaya dön
    fetchAndRender();
  }, 400);
});

// Limit değişim dinleyicisi
limitSelect.addEventListener("change", (e) => {
  const { q } = getQueryParams();
  updateURL(1, parseInt(e.target.value), q); // Limit değişince 1. sayfaya dön
  fetchAndRender();
});

// Tarayıcının "Geri / İleri" tuşlarına basıldığında URL'yi tekrar okuyup sayfayı güncelle
window.addEventListener("popstate", () => {
  fetchAndRender();
});

// İlk açılışta çalıştır
fetchAndRender();