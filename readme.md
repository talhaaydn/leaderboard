# Leaderboard

10.000.000 oyuncusu olan bir oyuna haftalık leaderboard özelliği eklenecek. Oyuncuların hafta başlangıcından itibaren kazandıkları paraya (oyun içi) göre sıralama yapılacak. Hafta tamamlandığında ilk 100 oyuncu yine oyun içi parayla ödüllendirilecek. Liste sıfırlanarak sistem yeniden başlayacak.

## Problemi Nasıl Çözdüm?

Bu tür projelerde okuma-yazma hızları yüksek olması gerekiyor. Bu sebeple noSQL bir veritabanı olan MongoDB ile birlikte Redis ile cache'leme yapmaya karar verdim.

Redis tarafında Sorted Set ve Hash veri tipleri kullanmayı tercih ettim. Sorted Set ile lider tablosu bilgilerine hızlı bir şekilde ulaşıyoruz. Hash ile oyuncunun username, age gibi bilgilerine veritabanına kıyasla daha hızlı ulaşabiliyoruz.

Oyuncu bilgilerini hem Hash'de hem veritabanında saklıyorum çünkü;

-   Oyuncu bilgilerine daha hızlı ulaşabiliyorum.
-   Redis tarafında veri kaybına uğrarsam veritabanından geri getirebilirim.

### Sorted Set Örnek

| Rank |      Key (User ID)       | Value (Score) |
| :--: | :----------------------: | :-----------: |
|  0   | 612d23a80015bb2861b4654a |     9995      |
|  1   | 612d23a80015bb2861b461db |     9985      |
|  2   | 612d23a80015bb2861b4628a |     9980      |
|  ..  |           ...            |      ...      |
|  ..  |           ...            |      ...      |

### Hash Örnek

|      Key (User ID)       |      username      | age | yesterday_rank |
| :----------------------: | :----------------: | :-: | :------------: |
| 612d23a80015bb2861b4654a |       Liam34       | 10  |       0        |
| 612d23a80015bb2861b461db |   Vicente.Hoppe    | 12  |       67       |
| 612d23a80015bb2861b4628a | Francesca.Ullrich9 | 25  |       35       |
|           ...            |        ...         | ... |      ...       |
|           ...            |        ...         | ... |      ...       |

## Projeyi Nasıl Çalıştırırsınız?

Projeyi çalıştırabilmek için bilgisayarınızda [Docker](https://www.docker.com/) kurulu olduğundan emin olun. Daha sonra aşağıdaki komutu çalıştırın.

```bash
$ docker-compose up -d
```

## Endpoints

Proje içerisinde 2 adet endpoint bulunuyor. Aşağıdaki açıklamalara dikkat ederek ilgili endpointlere istek yapabilirsiniz. Ayrıca Postman ile istek yapabilirsiniz. Proje içerisindeki **leaderboard.postman_collection.json** dosyasını Postman'e import edebilirsiniz.

### GET - Tüm Lider Tablosu

Lider tablosunda bulunan ilk 100 oyuncuyu, mevcut oyuncuyu, mevcut oyunucunun önündeki 3 ve arkasındaki 2 oyuncuyu JSON formatında getirir.

```
/api/leaderboard
Example: http://localhost:8080/leaderboard
Body:
{
    "player_id": "612d23a80015bb2861b462d4",
}
```

-   Lider tablosu verileri Sorted Set'de bulunamazsa veritabanından alınır. Her bir oyuncu bilgisi önce Sorted Set'e daha sonra HashMap'de kayıtlı değilse HashMap'e kayıt edilir.
-   Lider tablosu bilgileri Sorted Set ve HashMap'de bulunan veriler ile doldurulur.

Yanıt aşağıdaki gibi JSON formatında olacaktır:

```
{
    "leaderboard": [
        {
            "rank": 1,
            "rank_change": 0,
            "player_id": "612d23a80015bb2861b4654a",
            "username": "Liam34",
            "age": "10",
            "score": "9995"
        },
        {
            "rank": 2,
            "rank_change": 0,
            "player_id": "612d23a80015bb2861b461db",
            "username": "Vicente.Hoppe",
            "age": "12",
            "score": "9985"
        },

        .
        .
        .

        {
            "rank": 100,
            "rank_change": 0,
            "player_id": "612d23a80015bb2861b462f8",
            "username": "Edgardo.Ward",
            "age": "34",
            "score": "8962"
        }
    ],
    "playersOfFront": [
        {
            "player_id": "612d23a80015bb2861b4628a",
            "username": "Francesca.Ullrich9",
            "age": "25",
            "score": "9980",
            "rank": 3,
            "yesterday_rank": 0
        },
        {
            "player_id": "612d23a80015bb2861b46389",
            "username": "Hardy_Reichel",
            "age": "30",
            "score": "9979",
            "rank": 4,
            "yesterday_rank": 0
        },
        {
            "player_id": "612d23a80015bb2861b46283",
            "username": "Nicolette56",
            "age": "12",
            "score": "9971",
            "rank": 5,
            "yesterday_rank": 0
        }
    ],
    "currentPlayer": {
        "rank": 6,
        "rank_change": 0,
        "player_id": "612d23a80015bb2861b462d4",
        "username": "Yessenia_Adams84",
        "age": "20",
        "score": "9968"
    },
    "playersOfBehind": [
        {
            "player_id": "612d23a80015bb2861b464a7",
            "username": "Alberta.Baumbach82",
            "age": "36",
            "score": "9959",
            "rank": 7,
            "yesterday_rank": 0
        },
        {
            "player_id": "612d23a80015bb2861b46303",
            "username": "Grayson31",
            "age": "11",
            "score": "9956",
            "rank": 8,
            "yesterday_rank": 0
        }
    ],
```

### POST - Oyuncuya Puan Ekleme

İlgili oyuncuya gönderilen puan kadar ekleme yapılır.

```
/api/player/add-score
Example: http://localhost:8000/api/player/add-score
Body:
{
    "player_id": "612d23a80015bb2861b461cd",
    "score": 60
}
```

Oyuncunun veritabanında kayıtlı olup olmadığı kontrol edilir. Eğer veritabanında yoksa aşağıdaki gibi bir yanıt döner;

```
{
    "message": "Player doesn't find.",
    "success": false
}
```

-   Oyuncu bilgilerine HashMap üzerinden ulaşılmaya çalışılır. Eğer HashMap'de kayıtlı değilse kayıt edilir.
-   Oyuncunun alacağı puan hesaplanır. Sorted Set tarafında güncelleme sağlanır ve veritabanına eklenir.
-   Ödül havuzuna eklenecek oyun parası miktarı hesaplanır ve veritabanına kayıt edilir.

Bu işlemler başarılı bir şekilde tamamlanırsa aşağıdaki gibi bir yanıt döner;

```
{
    "message": "Score successfully added to player.",
    "success": true
}
```
