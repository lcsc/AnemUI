export default function struct(format:string):{
    iter_unpack(data:ArrayBufferLike):[]
    unpack(data:ArrayBufferLike):[chunkOffset:number, chunkSize:number]
}