package lk.sliit.microgrid.data.model
data class Station(
    val id: String,
    val name: String,
    val address: String,
    val latitude: Double,
    val longitude: Double,
    val capacityKwh: Double,
    val operatingStartTime: String,
    val operatingEndTime: String,
    val status: String

)